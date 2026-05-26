import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { RoomState, ChatMessage } from '../types';
import Markdown from 'react-markdown';
import { Send, Play, Users, Dices, Volume2, VolumeX, ShieldAlert, Trophy, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const animatedRolls = new Set<string>();

// SFX helper
const playSFX = (type: 'attack' | 'skill' | 'hit' | 'victory' | 'defeat') => {
  const sounds = {
    attack: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Sword swipe
    skill: 'https://assets.mixkit.co/active_storage/sfx/2592/2592-preview.mp3', // Magic
    hit: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Hit
    victory: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Win
    defeat: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3'   // Lose
  };
  const audio = new Audio(sounds[type]);
  audio.volume = 0.4;
  audio.play().catch(() => {}); // Browser policy might block
  if (navigator.vibrate) navigator.vibrate(type === 'hit' ? 100 : 50);
};

const DiceRollResult = ({ msg, isCrit, isFail, baseColor }: { msg: ChatMessage, isCrit: boolean, isFail: boolean, baseColor?: string }) => {
  const diceSides = msg.diceType || 20;
  const [rolling, setRolling] = useState(!animatedRolls.has(msg.id));
  const [tempVal, setTempVal] = useState(diceSides);

  useEffect(() => {
    if (!rolling) return;
    animatedRolls.add(msg.id);
    let flips = 0;
    const interval = setInterval(() => {
      setTempVal(Math.floor(Math.random() * diceSides) + 1);
      flips++;
      if (flips > 18) {
        clearInterval(interval);
        setRolling(false);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [rolling, msg.id, diceSides]);

  const getDiceSvg = (sides: number, className: string) => {
    switch(sides) {
      case 4: return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 20 2 20" /></svg>;
      case 6: return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>;
      case 8: return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 12 12 22 2 12" /></svg>;
      case 10: return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 20 10 12 22 4 10" /></svg>;
      case 12: return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 9 18 20 6 20 2 9" /></svg>;
      case 20: 
      default:
        return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 7 22 17 12 22 2 17 2 7" /></svg>;
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{
        scale: !rolling && (isCrit || isFail) ? [1, 1.05, 1] : 1,
        x: !rolling && (isCrit || isFail) ? [0, -4, 4, -4, 4, 0] : 0,
        rotate: !rolling && (isCrit || isFail) ? [0, -2, 2, -2, 2, 0] : 0
      }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center max-w-[200px] w-full bg-neutral-900 border ${!rolling && isCrit ? 'border-amber-500/50 shadow-md shadow-amber-900/20' : !rolling && isFail ? 'border-red-900/50 shadow-md shadow-red-900/20' : 'border-neutral-800'} rounded-xl p-3 text-center transition-colors duration-500`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${baseColor || 'text-neutral-400'}`}>{msg.senderName}</span> <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400">rolou D{diceSides}:</span>
      </div>
      
      <div className="relative mb-3 flex justify-center items-center w-16 h-16 sm:w-20 sm:h-20" style={{ perspective: "1000px" }}>
         <motion.div
           animate={rolling ? { 
             rotateX: [0, 180, 360, 540, 720],
             rotateY: [0, -180, -360, -540, -720],
             rotateZ: [0, 90, 180, 270, 360],
             scale: [1, 1.15, 1.3, 1.15, 1] 
           } : { 
             rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1 
           }}
           transition={rolling ? { duration: 1.5, ease: "linear" } : { duration: 0.5, type: "spring" }}
           style={{ transformStyle: "preserve-3d" }}
           className={`absolute inset-0 flex items-center justify-center ${rolling ? 'text-cyan-500/80 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]' : (isCrit ? 'text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : isFail ? 'text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'text-neutral-500')} transition-all duration-300`}
         >
           {getDiceSvg(diceSides, "w-full h-full")}
         </motion.div>
         <motion.div 
            animate={rolling ? { scale: [1, 1.25, 1], z: 50 } : { scale: 1, z: 0 }}
            className={`absolute z-10 flex items-center justify-center font-black font-mono text-xl sm:text-2xl ${diceSides === 4 ? 'mt-2' : ''} ${rolling ? 'text-white blur-[1px] opacity-80' : isCrit ? 'text-amber-400 text-2xl sm:text-3xl drop-shadow-sm' : isFail ? 'text-red-300 text-2xl sm:text-3xl drop-shadow-sm' : 'text-white drop-shadow-sm'} transition-all`}
         >
           {rolling ? tempVal : msg.rollResult}
         </motion.div>
      </div>
      
      <p className={`text-[10px] sm:text-xs font-serif text-neutral-300 italic px-2 transition-opacity duration-500 ${rolling ? 'opacity-0' : 'opacity-100'}`}>
        "{msg.text}"
      </p>
    </motion.div>
  );
};

const getClassColor = (c: string) => {
  const norm = c?.toLowerCase() || '';
  if (norm.includes('guerreir')) return 'text-red-500';
  if (norm.includes('mag')) return 'text-blue-500';
  if (norm.includes('arqueir')) return 'text-emerald-500';
  if (norm.includes('necromant')) return 'text-purple-500';
  if (norm.includes('paladin')) return 'text-amber-500';
  if (norm.includes('anã') || norm.includes('anao') || norm.includes('anão')) return 'text-orange-500';
  return 'text-neutral-400';
};

export function GameRoom({ 
  socket, 
  roomId, 
  initialState, 
  playerId 
}: { 
  socket: Socket; 
  roomId: string; 
  initialState: RoomState; 
  playerId: string;
}) {
  const [room, setRoom] = useState<RoomState>(initialState);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Character Data Persistence
  useEffect(() => {
    const saved = localStorage.getItem(`rpg_save_${roomId}_${playerId}`);
    if (saved) {
      const data = JSON.parse(saved);
      // We could emit a "restore_state" event here if server supported it,
      // but for now we just log it or use it to seed player UI
      console.log("Progresso local detectado:", data);
    }
  }, [roomId, playerId]);

  useEffect(() => {
    if (room.players[playerId]) {
      localStorage.setItem(`rpg_save_${roomId}_${playerId}`, JSON.stringify(room.players[playerId]));
    }
  }, [room.players, roomId, playerId]);

  // Transitions & Loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Music Handling
  useEffect(() => {
    const musicUrl = 'https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3'; // Generic loop-like placeholder
    // Using a more musical one if possible
    const fantasyTrack = 'https://www.chosic.com/wp-content/uploads/2021/04/The-Legend-of-Zelda-Breath-of-the-Wild-Main-Theme.mp3'; // Example path
    
    const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3');
    audio.loop = true;
    audio.volume = 0.15;
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) audioRef.current.pause();
      else audioRef.current.play().catch(() => console.log("User interaction required for audio"));
    }
  }, [isMuted, isLoading]);

  useEffect(() => {
    socket.on('room_state_update', (newState: RoomState) => {
      setRoom(newState);
      
      // Auto-sounds for combat
      const prevEnemyHp = room.enemy?.hp || 0;
      if (newState.enemy.hp < prevEnemyHp) playSFX('hit');
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setRoom(prev => {
        if (prev.chatHistory.some(m => m.id === msg.id)) return prev;
        return { ...prev, chatHistory: [...prev.chatHistory, msg] };
      });
      if (msg.type === 'player' || msg.type === 'dm') {
        // Subtle haptic or sfx?
      }
    });

    socket.on('dm_typing', (typing: boolean) => {
      setIsTyping(typing);
    });

    return () => {
      socket.off('room_state_update');
      socket.off('new_message');
      socket.off('dm_typing');
    };
  }, [socket, room.enemy?.hp]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room.chatHistory, isTyping]);

  const [activeCategory, setActiveCategory] = useState<'attack' | 'defend' | 'skill' | null>(null);

  const handleCombatAction = (category: 'attack' | 'defend' | 'skill', subAction?: string) => {
    if (isTyping || !room.isStarted) return;
    
    if (!subAction) {
      setActiveCategory(activeCategory === category ? null : category);
      return;
    }

    if (category === 'attack') playSFX('attack');
    if (category === 'skill') playSFX('skill');

    socket.emit('send_message', { text: '', actionType: category, subAction });
    setActiveCategory(null);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    socket.emit('send_message', { text: input.trim() });
    setInput('');
  };

  const handleRoll = () => {
    if (isTyping) return;
    const textToSend = input.trim() || "Rolar Dados";
    socket.emit('send_message', { text: textToSend, isRoll: true });
    setInput('');
  };

  const startGame = () => {
    socket.emit('start_game');
  };

  const playersList = Object.values(room.players);
  const me = room.players[playerId];

  // Game over detection
  const isDead = me?.stats && me.stats.hp <= 0;
  // Victory detection (Boss killed at lvl 10?)
  const isVictory = room.enemy.level >= 10 && room.enemy.hp <= 0;

  const getSubOptions = () => {
    if (!activeCategory || !me) return [];
    if (activeCategory === 'attack') return me.inventory || ["Punhos"];
    if (activeCategory === 'defend') {
       const options = ["Esquivar", "Bloquear"];
       if (me.inventory?.some(i => i.toLowerCase().includes('escudo'))) options.push("Escudo");
       if (me.characterClass.toLowerCase().includes('mago')) options.push("Barreira Mágica");
       return options;
    }
    if (activeCategory === 'skill') return me.skills || [];
    return [];
  };

  return (
    <div className="flex flex-col h-screen md:h-[100dvh] bg-neutral-950 font-sans text-neutral-200 overflow-hidden">
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full mb-6" 
            />
            <h2 className="text-2xl font-serif font-bold text-white mb-2 tracking-widest uppercase">Roll Your Destiny</h2>
            <p className="text-cyan-500 font-mono text-xs uppercase animate-pulse">Tecendo fios do destino...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {isDead && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[90] bg-red-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm"
          >
            <ShieldAlert size={64} className="text-red-500 mb-6" />
            <h2 className="text-5xl font-serif font-bold text-white mb-4 tracking-tight">VOCÊ MORREU</h2>
            <p className="text-red-300 max-w-md mb-8">Sua jornada termina aqui, sob as sombras do destino. Mas a lenda continua em outros mundos.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white rounded-full font-bold uppercase tracking-widest transition-all"
            >
              Tentar Novamente
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Screen */}
      <AnimatePresence>
        {isVictory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[90] bg-cyan-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm"
          >
            <Trophy size={64} className="text-amber-400 mb-6" />
            <h1 className="text-6xl font-serif font-bold text-white mb-4 tracking-tight">VITÓRIA ÉPICA</h1>
            <p className="text-cyan-200 max-w-md mb-8">Você derrotou o Guardião do Abismo e libertou estas terras das garras da sombra. Sua lenda será eterna.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-bold uppercase tracking-widest transition-all"
            >
              Nova Jornada
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            ROLL YOUR DESTINY
          </h1>
          <p className="text-[10px] text-neutral-500 font-mono tracking-wider ml-4">SALA: {roomId}</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-neutral-500 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950 rounded-full border border-neutral-800 text-sm">
            <Users size={16} className="text-neutral-500" />
            <span className="font-semibold text-neutral-300">{playersList.length}</span>
          </div>
          
          {!room.isStarted && (
            <button 
              onClick={startGame}
              className="flex items-center gap-2 px-4 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-full font-medium transition-colors shadow-lg shadow-cyan-900/20"
            >
              <Play size={16} />
              <span className="hidden sm:inline">Iniciar Jogo</span>
            </button>
          )}
        </div>
      </header>

      {/* Combat UI Bar (HP and Enemies) */}
      {room.isStarted && (
        <div className="bg-neutral-900 border-b border-neutral-800 p-3 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
           {/* Enemy Status */}
           <div className="flex-1 w-full md:w-auto">
             <div className="flex justify-between items-end mb-1">
               <span className="text-xs font-bold uppercase tracking-tighter text-red-500 font-mono flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                 {room.enemy.name} <span className="text-[9px] bg-red-900/50 px-1 rounded text-red-300">Level {room.enemy.level}</span>
               </span>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] font-mono text-amber-500/80 uppercase mr-2">{room.enemy.intent}</span>
                 <span className="text-[10px] font-mono text-neutral-500">{room.enemy.hp}/{room.enemy.maxHp} HP</span>
               </div>
             </div>
             <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
               <motion.div 
                 initial={false}
                 animate={{ width: `${(room.enemy.hp / room.enemy.maxHp) * 100}%` }}
                 className={`h-full ${room.enemy.hp < (room.enemy.maxHp * 0.3) ? 'bg-red-600' : 'bg-red-500'} transition-all duration-500`}
               />
             </div>
           </div>

           {/* Personal Status Icons */}
           {me?.stats && (
             <div className="flex gap-4 px-4 bg-neutral-950/50 py-2 rounded-xl border border-neutral-800/50">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 mb-0.5">Vida</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-neutral-800 rounded-full overflow-hidden">
                       <motion.div 
                        initial={false}
                        animate={{ width: `${(me.stats.hp / me.stats.maxHp) * 100}%` }}
                        className="h-full bg-green-500"
                       />
                    </div>
                    <span className="text-[10px] font-mono text-green-400 font-bold">{me.stats.hp}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 mb-0.5">Mana</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-neutral-800 rounded-full overflow-hidden">
                       <motion.div 
                        initial={false}
                        animate={{ width: `${(me.stats.mp / me.stats.maxMp) * 100}%` }}
                        className="h-full bg-blue-500"
                       />
                    </div>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">{me.stats.mp}</span>
                  </div>
                </div>
             </div>
           )}
        </div>
      )}

      {/* Main Container */}
      <div className="relative flex flex-1 overflow-hidden">
        
        {/* Chat / Narrative Area */}
        <div className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full border-x border-neutral-800/50 bg-neutral-950/50">
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
            {!room.isStarted ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Play size={24} className="text-neutral-500 ml-1" />
                </div>
                <div>
                  <p className="font-serif text-lg text-neutral-300">Pronto para jogar?</p>
                  <p className="text-sm font-sans text-neutral-500">Clique em Iniciar Jogo para começar.</p>
                </div>
              </div>
            ) : null}

            <AnimatePresence>
              {room.chatHistory.map(msg => {
                const isMe = msg.sender === playerId;
                
                if (msg.type === 'system') {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id} 
                      className="flex justify-center my-4"
                    >
                      <span className="text-xs text-neutral-500 font-mono text-center max-w-md px-4 py-1 bg-neutral-900/50 rounded-full border border-neutral-800">
                        {msg.text}
                      </span>
                    </motion.div>
                  );
                }

                if (msg.type === 'dm') {
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id} 
                      className="flex flex-col gap-1 my-6 mr-8 md:mr-16"
                    >
                      <span className="text-sm font-sans text-cyan-400 font-semibold tracking-wide uppercase px-2">Mestre</span>
                      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl rounded-tl-sm p-4 md:p-5 text-neutral-200">
                        <div className="prose prose-invert prose-cyan max-w-none prose-p:leading-relaxed prose-p:font-serif prose-p:text-[1.05rem] md:prose-p:text-[1.1rem]">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (msg.type === 'roll') {
                  const senderClass = room.players[msg.sender]?.characterClass || '';
                  const titleColor = getClassColor(senderClass);
                  const isCrit = msg.rollResult === 20;
                  const isFail = msg.rollResult === 1;
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      key={msg.id} 
                      className={`flex flex-col gap-1 my-4 items-center`}
                    >
                      <DiceRollResult msg={msg} isCrit={isCrit} isFail={isFail} baseColor={titleColor} />
                    </motion.div>
                  );
                }

                // Player Message
                const senderClass = room.players[msg.sender]?.characterClass || '';
                const titleColor = getClassColor(senderClass);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex flex-col gap-1 my-2 ${isMe ? 'items-end ml-8 md:ml-16' : 'items-start mr-8 md:mr-16'}`}
                  >
                    <span className={`text-sm font-sans ${titleColor} font-semibold tracking-wide uppercase px-2`}>{msg.senderName}</span>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-[0.95rem] ${isMe ? 'bg-cyan-700/90 text-white rounded-tr-sm' : 'bg-neutral-800 text-neutral-200 rounded-tl-sm'}`}>
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 pl-2 text-cyan-400 font-mono text-xs uppercase tracking-wider"
              >
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Mestre digitando...</span>
              </motion.div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-4 bg-neutral-900 border-t border-neutral-800 shrink-0">
            {room.isStarted && (
              <div className="relative max-w-4xl mx-auto mb-3">
                {/* Main Categories */}
                <div className="flex gap-1.5 mb-2 w-full">
                  <button 
                    onClick={() => handleCombatAction('attack')}
                    disabled={isTyping}
                    className={`flex-1 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50
                      ${activeCategory === 'attack' ? 'bg-red-600 text-white border-red-500' : 'bg-red-900/30 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'}`}
                  >
                    ⚔️ Atacar
                  </button>
                  <button 
                    onClick={() => handleCombatAction('defend')}
                    disabled={isTyping}
                    className={`flex-1 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50
                      ${activeCategory === 'defend' ? 'bg-orange-600 text-white border-orange-500' : 'bg-orange-900/30 border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white'}`}
                  >
                    🛡️ Defender
                  </button>
                  <button 
                    onClick={() => handleCombatAction('skill')}
                    disabled={isTyping}
                    className={`flex-1 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50
                      ${activeCategory === 'skill' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-cyan-900/30 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white'}`}
                  >
                    ✨ Skill
                  </button>
                </div>

                {/* Sub-options Menu */}
                {activeCategory && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={activeCategory}
                    className="absolute bottom-full left-0 mb-3 w-full bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-1.5 grid grid-cols-2 gap-1.5 z-50 overflow-hidden"
                  >
                    {getSubOptions().map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleCombatAction(activeCategory, opt)}
                        className="flex items-center justify-center py-2.5 px-2 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:bg-neutral-700 hover:border-neutral-600 transition-all text-[9.5px] font-bold uppercase tracking-tight text-neutral-300 text-center leading-tight"
                      >
                        {opt}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
            <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="O que você faz?"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-full pl-6 pr-24 py-3.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-sans text-sm disabled:opacity-50"
                disabled={isTyping}
              />
              <button 
                type="button"
                onClick={handleRoll}
                disabled={isTyping}
                title="Rolar Dados"
                className={`absolute right-[3.25rem] top-1.5 bottom-1.5 aspect-square text-neutral-500 hover:text-amber-500 hover:bg-neutral-900 disabled:text-neutral-700 rounded-full flex items-center justify-center transition-colors`}
              >
                <Dices size={20} />
              </button>
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-cyan-700 hover:bg-cyan-600 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
          </div>
        </div>
        
        {/* Desktop Sidebar (Players) */}
        <div className="hidden lg:flex w-64 bg-neutral-900 border-l border-neutral-800 flex-col overflow-y-auto shrink-0">
          <div className="p-4 uppercase tracking-widest text-[10px] font-bold text-neutral-500 border-b border-neutral-800">
            Jogadores ({playersList.length})
          </div>
          <div className="p-4 space-y-3">
            <AnimatePresence>
              {playersList.map(p => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={p.id} 
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-neutral-400 border border-neutral-700">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-neutral-200 truncate">{p.name}</span>
                    <span className="text-[10px] uppercase text-neutral-500 truncate">{p.characterClass}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
}
