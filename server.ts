import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the Gemini API key is available
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// State representations
type PlayerStats = {
  str: number;
  dex: number;
  int: number;
  def: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
};

type Player = {
  id: string;
  name: string;
  characterClass: string;
  gender: string;
  stats?: PlayerStats;
  inventory?: string[];
  skills?: string[];
};

type Enemy = {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  intent?: string;
};

type RoomState = {
  id: string;
  players: Record<string, Player>;
  chatHistory: { id: string, sender: string, senderName: string, text: string, type: 'system' | 'player' | 'dm' | 'roll', rollResult?: number, diceType?: number }[];
  isStarted: boolean;
  systemContext: string;
  lastRequestTime?: number;
  enemy: Enemy;
};

const rooms: Record<string, RoomState> = {};
const responseCache: Record<string, string> = {};
const MAX_CACHE_SIZE = 100;

// Helper to add to cache with size limit
function addToCache(key: string, value: string) {
  const keys = Object.keys(responseCache);
  if (keys.length >= MAX_CACHE_SIZE) {
    delete responseCache[keys[0]]; // Simple FIFO
  }
  responseCache[key] = value;
}

// Helper to get or create room
function getRoom(roomId: string): RoomState {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      players: {},
      chatHistory: [],
      isStarted: false,
      enemy: { name: "Abutre das Sombras", hp: 60, maxHp: 60, level: 1 },
      systemContext: `Você é o Mestre do RPG "Roll Your Destiny". Fantasia Sombria.
REGRAS: MÁXIMO 2 FRASES. Seja épico e direto.
ESTADO: Jogadores estão em combate ou exploração.`
    };
  }
  return rooms[roomId];
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });

  async function invokeGeminiWithRetry(room: string, prompt: string, config: any, isJson: boolean = false) {
    const roomState = rooms[room];
    const now = Date.now();
    
    // 1. Cooldown Check (5 seconds)
    if (roomState?.lastRequestTime && now - roomState.lastRequestTime < 5000 && !isJson) {
      console.log(`[COOLDOWN] Skipping AI for ${room}`);
      return { text: "O Mestre observa em silêncio enquanto a tensão aumenta." };
    }
    if (!isJson) roomState.lastRequestTime = now;

    // 2. Cache Check
    const cacheKey = `${room}-${prompt.substring(0, 100)}`;
    if (responseCache[cacheKey] && !isJson) {
      console.log(`[CACHE HIT] Returning cached response for ${room}`);
      return { text: responseCache[cacheKey] };
    }

    let attempts = 0;
    // Pre-select most economical models
    let modelOptions = ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-2.0-flash-lite-preview-02-05"];
    let lastError;

    while (attempts < modelOptions.length) {
      try {
        if (!isJson) io.to(room).emit('dm_typing', true);
        const response = await ai.models.generateContent({
          model: modelOptions[attempts],
          contents: prompt,
          config: {
            ...config,
            maxOutputTokens: 100, // Limit output further
          }
        });
        if (!isJson) io.to(room).emit('dm_typing', false);
        
        // Save to cache
        if (response.text && !isJson) {
          addToCache(cacheKey, response.text);
        }
        
        return response;
      } catch (err: any) {
        console.error(`Gemini Error on ${modelOptions[attempts]}:`, err.message);
        lastError = err;
        if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('rate limit'))) {
          attempts++;
          await new Promise(r => setTimeout(r, 2000));
        } else {
          break; 
        }
      }
    }
    if (!isJson) io.to(room).emit('dm_typing', false);
    
    return { text: null }; 
  }

  function handleCombatLogic(room: RoomState, player: Player, actionType: 'attack' | 'defend' | 'skill' | 'none', rollResult: number, diceType: number, subAction: string = "") {
    let message = "";
    const enemy = room.enemy;
    const playerStats = player.stats || { str: 10, dex: 10, int: 10, def: 5, hp: 25, maxHp: 25, mp: 15, maxMp: 15 };

    let playerMitigation = 0; // % of damage reduced
    let playerEvasion = false;

    // --- PLAYER ACTION ---
    if (actionType === 'attack') {
      const isUnarmed = subAction.toLowerCase().includes('punhos') || subAction.toLowerCase().includes('mãos');
      const toHitThreshold = isUnarmed ? 8 : 10; // Unarmed is easier to hit but less damage
      
      if (rollResult >= toHitThreshold) {
        let baseDamage = isUnarmed ? 3 : 6;
        let damage = Math.floor(Math.random() * 4) + baseDamage + Math.floor(playerStats.str / 3);
        
        if (rollResult >= 19) {
          damage = Math.floor(damage * 1.5);
          message = `CRÍTICO! Com ${subAction}, você desfere um golpe magistral: ${damage} de dano!`;
        } else {
          message = `Sucesso! Seu ${subAction} atinge o inimigo causando ${damage} de dano.`;
        }
        enemy.hp = Math.max(0, enemy.hp - damage);
      } else {
        message = `O ${enemy.name} desvia do seu ataque de ${subAction}.`;
      }
    } else if (actionType === 'defend') {
      const isShield = subAction.toLowerCase().includes('escudo');
      const isEvasion = subAction.toLowerCase().includes('esquivar') || subAction.toLowerCase().includes('recuar');
      
      if (isEvasion) {
        const dodgeRoll = Math.floor(Math.random() * 20) + 1 + Math.floor(playerStats.dex / 4);
        if (dodgeRoll >= 12) {
          playerEvasion = true;
          message = `Você se move com destreza, preparando-se para esquivar de qualquer golpe!`;
        } else {
          playerMitigation = 30;
          message = `Você tenta esquivar, mas acaba apenas diminuindo sua exposição ao dano.`;
        }
      } else {
        playerMitigation = isShield ? 85 : 50;
        message = `Você ergue sua defesa com ${subAction}, reduzindo drasticamente o próximo impacto.`;
      }
    } else if (actionType === 'skill') {
      const manaCost = subAction.includes("Cura") ? 4 : 6;
      
      if (playerStats.mp >= manaCost) {
        playerStats.mp -= manaCost;
        const effect = Math.floor(Math.random() * 10) + 12 + Math.floor(playerStats.int / 2);
        
        if (subAction.includes("Míssil") || subAction.includes("Explosão") || subAction.includes("Golpe") || subAction.includes("Tiro")) {
          enemy.hp = Math.max(0, enemy.hp - effect);
          message = `HABILIDADE: ${subAction}! Você canaliza seu poder causando ${effect} de dano direto!`;
        } else if (subAction.includes("Cura") || subAction.includes("Resplendor")) {
          playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + effect);
          message = `MAGIA: ${subAction}! Uma aura revigorante recupera ${effect} de sua vida.`;
        } else {
          message = `Você executa ${subAction}, alterando o fluxo do combate!`;
        }
      } else {
        message = `Você tenta usar ${subAction}, mas falta energia espiritual!`;
      }
    }

    // --- ENEMY TURN (REBALANCED & TELEGRAPHED) ---
    if (enemy.hp > 0 && actionType !== 'none') {
      const currentIntent = enemy.intent || "Ataque Normal";
      let enemyDmg = 0;
      
      // 1. Execute Current Intent
      if (currentIntent.includes("Pesado") || currentIntent.includes("Esmagar")) {
        const toHit = Math.floor(Math.random() * 20) + 1;
        if (toHit >= 8) { // Easier to hit but predictable
          enemyDmg = Math.floor(Math.random() * 8) + 8 + enemy.level;
          if (playerEvasion) {
            message += ` O ${enemy.name} descarrega o golpe pesado, mas você rola para longe no último segundo!`;
          } else {
            if (playerMitigation > 0) {
              enemyDmg = Math.max(1, Math.floor(enemyDmg * (1 - playerMitigation / 100)));
              message += ` O ${enemy.name} esmaga sua defesa! Você sente o impacto mas absorve o golpe: ${enemyDmg} de dano.`;
            } else {
              message += ` O ${enemy.name} te atinge com um golpe devastador: ${enemyDmg} de dano!`;
            }
            playerStats.hp = Math.max(0, playerStats.hp - enemyDmg);
          }
        } else {
          message += ` O ${enemy.name} erra o golpe pesado, criando uma abertura!`;
        }
      } else if (currentIntent.includes("Rápido") || currentIntent.includes("Boter")) {
        // Harder to dodge, lower damage
        enemyDmg = Math.floor(Math.random() * 4) + 3 + enemy.level;
        if (playerEvasion && Math.random() > 0.5) {
          message += ` O ${enemy.name} é rápido demais! Mesmo esquivando, você é atingido de raspão: ${Math.floor(enemyDmg/2)} de dano.`;
          playerStats.hp = Math.max(0, playerStats.hp - Math.floor(enemyDmg/2));
        } else if (!playerEvasion) {
          message += ` O ${enemy.name} te ataca com uma sequência veloz: ${enemyDmg} de dano!`;
          playerStats.hp = Math.max(0, playerStats.hp - enemyDmg);
        } else {
          message += ` Você escapa milagrosamente do ataque veloz do ${enemy.name}!`;
        }
      } else if (currentIntent.includes("Observar") || currentIntent.includes("Preparar")) {
        message += ` O ${enemy.name} não ataca, parecendo estudar seus movimentos.`;
      } else {
        // Standard Attack
        const toHit = Math.floor(Math.random() * 20) + 1;
        if (toHit >= 10 + Math.floor(playerStats.def / 5)) {
          enemyDmg = Math.floor(Math.random() * 5) + 4 + enemy.level;
          if (playerMitigation > 0) enemyDmg = Math.max(1, Math.floor(enemyDmg * (1 - playerMitigation / 100)));
          message += ` O ${enemy.name} te ataca: ${enemyDmg} de dano.`;
          playerStats.hp = Math.max(0, playerStats.hp - enemyDmg);
        } else {
          message += ` O ${enemy.name} tenta um ataque mas você bloqueia com facilidade.`;
        }
      }

      // 2. Set Next Intent (Telegraphing)
      const nextRoll = Math.floor(Math.random() * 100);
      if (nextRoll < 20) {
        enemy.intent = "Ataque Pesado";
        message += ` [!!] O ${enemy.name} levanta sua arma para um golpe esmagador!`;
      } else if (nextRoll < 40) {
        enemy.intent = "Ataque Rápido";
        message += ` [!] O ${enemy.name} assume uma postura ágil, preparando um bote veloz!`;
      } else if (nextRoll < 60) {
        enemy.intent = "Observar";
        message += ` [-] O ${enemy.name} recua, analisando sua estratégia.`;
      } else {
        enemy.intent = "Ataque Normal";
        message += ` [>] O ${enemy.name} se prepara para avançar novamente.`;
      }
    }

    // --- VICTORY & PROGRESSION ---
    if (enemy.hp <= 0) {
      const gold = Math.floor(Math.random() * 20) + 15;
      const lootOptions = ["Espada de Ferro", "Poção de Vida", "Anel de Prata", "Escudo de Madeira", "Manto de Seda", "Adaga de Bronze"];
      const loot = lootOptions[Math.floor(Math.random() * lootOptions.length)];
      
      // Heroic Recovery on Victory
      playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + 5);
      playerStats.mp = Math.min(playerStats.maxMp, playerStats.mp + 5);

      if (player.inventory && !player.inventory.includes(loot)) {
        player.inventory.push(loot);
      }

      // Level Up Stats
      enemy.level += 1;
      playerStats.maxHp += 5;
      playerStats.maxMp += 3;
      playerStats.str += 1;
      playerStats.dex += 1;
      playerStats.int += 1;

      if (enemy.level === 3 && player.skills && !player.skills.includes("Impacto Brutal")) {
        const newSkill = player.characterClass.toLowerCase().includes('mago') ? "Pilar de Fogo" : "Impacto Brutal";
        player.skills.push(newSkill);
        message += ` VOCÊ EVOLUIU! Nova habilidade aprendida: [${newSkill}].`;
      }

      message += ` O ${enemy.name} foi derrotado! Você saqueou ${gold} moedas e um [${loot}]. (+5 HP/MP restaurados)`;
      
      enemy.maxHp = 50 + (enemy.level * 15);
      enemy.hp = enemy.maxHp;
      enemy.name = enemy.level % 3 === 0 ? "Chefe: Guardião do Abismo" : "Morto-Vivo Errante";
    }

    return message;
  }

  function generateOfflineStartResponse() {
     return "(Modo Offline de Sobrevivência) Bem-vindos, heróis, pois a conexão com os deuses foi cortada. Vocês estão por conta própria nas Cavernas do Desespero. A escuridão espreita e os perigos são reais. Preparem suas armas. Qual o primeiro passo de vocês?";
  }

  function generateOfflineResponse(playerName: string, text: string, lastRoll: number | null) {
    const events = [
      "Das sombras, uma figura pálida e deformada se move rapidamente na sua direção.",
      "O chão treme sob seus pés e algo rola na escuridão profunda.",
      "Você sente um frio inexplicável percorrer a espinha enquanto as tochas tremeluzem e ameaçam apagar.",
      "O eco distante soa como um cântico antigo, desorientando seus sentidos.",
      "Os oponentes aproveitam a brecha e avançam furiosamente!"
    ];
    let outcome = "Você observa o ambiente.";
    if (lastRoll) {
      if (lastRoll >= 15) {
        outcome = `Com um esforço formidável de ${lastRoll}, sua ação é um sucesso devastador! Você supera o desafio com maestria.`;
      } else if (lastRoll >= 8) {
        outcome = `Seu resultado de ${lastRoll} é suficiente para continuar, mas o esforço foi exaustivo. Você sobrevive por agora.`;
      } else {
        outcome = `Um erro fatal! Seu tropeço (${lastRoll}) atrai a ira imediata do ambiente hostil. Você sofre as consequências.`;
      }
    }

    const event = events[Math.floor(Math.random() * events.length)];
    return `(Sobrevivência Offline) ${playerName}, ${outcome} ${event} Qual é a próxima decisão do grupo?`;
  }

  // Socket actions
  io.on('connection', (socket) => {
    let currentRoom = '';
    let currentPlayerId = '';

    socket.on('join_room', ({ roomId, player }: { roomId: string, player: Omit<Player, 'id'> }) => {
      currentRoom = roomId || 'taverna';
      currentPlayerId = socket.id;
      
      const room = getRoom(currentRoom);
      
      // Starting setup based on class
      const startingInventory = ["Punhos"];
      const startingSkills = [];
      const charClass = player.characterClass.toLowerCase();

    if (charClass.includes('guerreiro') || charClass.includes('paladino')) {
        startingInventory.push("Espada Curta", "Escudo de Madeira");
        startingSkills.push("Golpe Pesado");
      } else if (charClass.includes('mago') || charClass.includes('bruxo')) {
        startingInventory.push("Cajado de Aprendiz");
        startingSkills.push("Míssil Mágico", "Cura Leve");
      } else if (charClass.includes('arqueiro') || charClass.includes('ladino')) {
        startingInventory.push("Arco Curto");
        startingSkills.push("Tiro Preciso", "Recuar");
      }

      room.players[currentPlayerId] = { 
        id: currentPlayerId, 
        ...player,
        stats: {
          str: charClass.includes('guerreiro') ? 14 : 10,
          dex: charClass.includes('arqueiro') ? 14 : 10,
          int: charClass.includes('mago') ? 14 : 10,
          def: 8,
          hp: 30,
          maxHp: 30,
          mp: 20,
          maxMp: 20
        },
        inventory: startingInventory,
        skills: startingSkills
      };
      
      socket.join(currentRoom);
      
      const eventMsg = {
        id: uuidv4(),
        sender: 'system',
        senderName: 'System',
        text: `${player.name} (${player.characterClass}) entrou na sessão.`,
        type: 'system' as const,
      };
      room.chatHistory.push(eventMsg);
      
      io.to(currentRoom).emit('room_state_update', room);
      io.to(currentRoom).emit('new_message', eventMsg);
    });

    socket.on('start_game', async () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      
      if (room.isStarted) return;
      room.isStarted = true;
      
      const eventMsg = {
        id: uuidv4(),
        sender: 'system',
        senderName: 'System',
        text: `O jogo começou! O Mestre da Campanha está preparando o cenário...`,
        type: 'system' as const,
      };
      room.chatHistory.push(eventMsg);
      io.to(currentRoom).emit('room_state_update', room);
      io.to(currentRoom).emit('new_message', eventMsg);

      // Trigger first Gemini prompt
      try {
        const playerNames = Object.values(room.players).map(p => `${p.name} (${p.gender}, ${p.characterClass})`).join(', ');
        const prompt = `A campanha começou. Jogadores: ${playerNames}.
Descreva rapidamente o ambiente sombrio inicial e apresente a principal ameaça ou objetivo final (o propósito central desta campanha). SEJA CURTO (3 ou 4 frases). Peça a ação do grupo.`;
        
        io.to(currentRoom).emit('dm_typing', true);
        let dmText = "";
        try {
          const response = await invokeGeminiWithRetry(currentRoom, prompt, {
            systemInstruction: room.systemContext,
            temperature: 0.9,
          });
          io.to(currentRoom).emit('dm_typing', false);
          
          if (response.text) {
             dmText = response.text;
          } else {
             dmText = generateOfflineStartResponse();
          }
        } catch (err: any) {
          console.error("Gemini Error:", err);
          io.to(currentRoom).emit('dm_typing', false);
          dmText = generateOfflineStartResponse();
        }

        const dmMsg = {
          id: uuidv4(),
          sender: 'dm',
          senderName: 'Mestre',
          text: dmText,
          type: 'dm' as const,
        };
        room.chatHistory.push(dmMsg);
        io.to(currentRoom).emit('new_message', dmMsg);
      } catch (err: any) {
        console.error("Critical Start Error:", err);
      }
    });

    socket.on('send_message', async ({ text, isRoll: isManualRoll, diceType: manualDiceType, actionType = 'none', subAction = "" }: { text: string, isRoll?: boolean, diceType?: number, actionType?: 'attack' | 'defend' | 'skill' | 'none', subAction?: string }) => {
      if (!currentRoom || !currentPlayerId) return;
      const room = getRoom(currentRoom);
      const player = room.players[currentPlayerId];
      if (!player) return;

      let actionText = text.trim();
      let rollResult: number | undefined = undefined;
      let finalDiceType = manualDiceType || (isManualRoll || actionType !== 'none' ? 20 : 0);
      let isRoll = isManualRoll || actionType !== 'none';

      // Local Arithmetic for Combat
      let combatFeedback = "";
      if (isRoll) {
        rollResult = Math.floor(Math.random() * finalDiceType) + 1;
        combatFeedback = handleCombatLogic(room, player, actionType, rollResult, finalDiceType, subAction);
      }

      if (actionType !== 'none') {
        actionText = subAction || (actionType === 'attack' ? 'Atacar' : actionType === 'defend' ? 'Defender' : 'Habilidade');
      }

      const playerMsg = {
        id: uuidv4(),
        sender: currentPlayerId,
        senderName: player.name,
        text: actionText,
        type: (isRoll ? 'roll' : 'player') as any,
        rollResult,
        diceType: finalDiceType,
      };
      room.chatHistory.push(playerMsg);
      io.to(currentRoom).emit('new_message', playerMsg);
      if (isRoll) await new Promise(r => setTimeout(r, 1000));

      // Tell Gemini (Narrative only)
      if (room.isStarted) {
        try {
          // Reduced Context (Last 5 messages)
          const recentHistory = room.chatHistory.slice(-5).map(m => 
            `${m.senderName}: ${m.text}${m.rollResult ? ` (Rolou ${m.rollResult}/D${m.diceType})` : ''}`
          ).join('\n');

          const stats = player.stats || { hp: 15, maxHp: 15 };
          const prompt = `RESUMO JOGO: Inimigo (${room.enemy.name}) HP: ${room.enemy.hp}/${room.enemy.maxHp}. Jogador ${player.name} HP: ${stats.hp}/${stats.maxHp}.
HISTÓRICO:
${recentHistory}
LOCAL FEEDBACK: ${combatFeedback}

NARRE A CONSEQUÊNCIA (MÁXIMO 2 FRASES CURTAS).`;

          let dmText = "";
          try {
            const response = await invokeGeminiWithRetry(currentRoom, prompt, {
                systemInstruction: room.systemContext,
                temperature: 0.7,
              });
              
              if (response.text) {
                 dmText = response.text;
              } else {
                 dmText = combatFeedback || generateOfflineResponse(player.name, actionText, rollResult === undefined ? null : rollResult);
              }
          } catch (err: any) {
             dmText = combatFeedback || generateOfflineResponse(player.name, actionText, rollResult === undefined ? null : rollResult);
          }
          
          const dmMsg = {
            id: uuidv4(),
            sender: 'dm',
            senderName: 'Mestre',
            text: dmText,
            type: 'dm' as const,
          };
          room.chatHistory.push(dmMsg);
          io.to(currentRoom).emit('new_message', dmMsg);
          io.to(currentRoom).emit('room_state_update', room); // Sync HP updates
        } catch (err: any) {
          console.error("Narrative Error:", err);
        }
      }
    });

    socket.on('disconnect', () => {
      if (currentRoom && currentPlayerId) {
        const room = getRoom(currentRoom);
        const player = room.players[currentPlayerId];
        if (player) {
          const eventMsg = {
            id: uuidv4(),
            sender: 'system',
            senderName: 'System',
            text: `${player.name} deixou a sessão.`,
            type: 'system' as const,
          };
          room.chatHistory.push(eventMsg);
          delete room.players[currentPlayerId];
          io.to(currentRoom).emit('room_state_update', room);
          io.to(currentRoom).emit('new_message', eventMsg);
        }
      }
    });
  });

  // Express APIs
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
