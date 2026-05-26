import React, { useState } from 'react';
import { Player } from '../types';
import { 
  Sword, Shield, Book, Wand2, Target, Wind, ShieldPlus, Sun, 
  Axe, Hammer, Key, Crosshair, PlusSquare, Sparkles, User, Settings, BookOpen, X, Music, Star
} from 'lucide-react';

const CLASSES = [
  { 
    id: 'guerreiro', 
    nameM: 'Guerreiro', 
    nameF: 'Guerreira', 
    theme: 'text-[#ef4444] border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.3)] from-[#451a1a]', 
    textColor: 'text-[#ef4444]',
    icons: [<Sword size={16} key="1"/>, <Shield size={16} key="2"/>],
    mainIcon: <Sword size={80} strokeWidth={1} />,
    description: 'Mestre do combate corpo a corpo. Força e coragem!'
  },
  { 
    id: 'mago', 
    nameM: 'Mago', 
    nameF: 'Maga', 
    theme: 'text-[#3b82f6] border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.3)] from-[#1e3a8a]',
    textColor: 'text-[#3b82f6]',
    icons: [<Book size={16} key="1"/>, <Wand2 size={16} key="2"/>],
    mainIcon: <Wand2 size={80} strokeWidth={1} />,
    description: 'Dominador das artes arcanas. Sabedoria e destruição!'
  },
  { 
    id: 'arqueiro', 
    nameM: 'Arqueiro', 
    nameF: 'Arqueira', 
    theme: 'text-[#10b981] border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.3)] from-[#064e3b]',
    textColor: 'text-[#10b981]',
    icons: [<Target size={16} key="1"/>, <Wind size={16} key="2"/>],
    mainIcon: <Target size={80} strokeWidth={1} />,
    description: 'Atacante à distância. Precisão e agilidade letais!'
  },
  { 
    id: 'paladino', 
    nameM: 'Paladino', 
    nameF: 'Paladina', 
    theme: 'text-[#eab308] border-[#eab308] shadow-[0_0_15px_rgba(234,179,8,0.3)] from-[#713f12]',
    textColor: 'text-[#eab308]',
    icons: [<ShieldPlus size={16} key="1"/>, <Sun size={16} key="2"/>],
    mainIcon: <ShieldPlus size={80} strokeWidth={1} />,
    description: 'Defensor da luz. Fé inabalável e proteção divina!'
  },
  { 
    id: 'anao', 
    nameM: 'Anão', 
    nameF: 'Anã', 
    theme: 'text-[#f97316] border-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.3)] from-[#7c2d12]',
    textColor: 'text-[#f97316]',
    icons: [<Axe size={16} key="1"/>, <Hammer size={16} key="2"/>],
    mainIcon: <Axe size={80} strokeWidth={1} />,
    description: 'Forte e resistente. Perito em forja e batalhas difíceis!'
  },
  { 
    id: 'ladrao', 
    nameM: 'Ladrão', 
    nameF: 'Ladrão', 
    theme: 'text-[#a855f7] border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.3)] from-[#4c1d95]',
    textColor: 'text-[#a855f7]',
    icons: [<Crosshair size={16} key="1"/>, <Key size={16} key="2"/>],
    mainIcon: <Key size={80} strokeWidth={1} />,
    description: 'Sombra e astúcia. Especialista em furtos e ataques rápidos!'
  },
  { 
    id: 'clerigo', 
    nameM: 'Clérigo', 
    nameF: 'Clériga', 
    theme: 'text-[#cbd5e1] border-[#cbd5e1] shadow-[0_0_15px_rgba(203,213,225,0.3)] from-[#334155]',
    textColor: 'text-[#cbd5e1]',
    icons: [<PlusSquare size={16} key="1"/>, <Sparkles size={16} key="2"/>],
    mainIcon: <Sparkles size={80} strokeWidth={1} />,
    description: 'Curandeiro e guia. Poder sagrado para proteger e curar!'
  },
  { 
    id: 'bardo', 
    nameM: 'Bardo', 
    nameF: 'Barda', 
    theme: 'text-[#ec4899] border-[#ec4899] shadow-[0_0_15px_rgba(236,72,153,0.3)] from-[#831843]',
    textColor: 'text-[#ec4899]',
    icons: [<Music size={16} key="1"/>, <Star size={16} key="2"/>],
    mainIcon: <Music size={80} strokeWidth={1} />,
    description: 'Mestre das artes. Inspirador e engenhoso com magias!'
  },
];

const Divider = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center gap-4 w-full my-8">
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#5a4e3d]"></div>
    <span className="text-[#a89674] text-xs md:text-sm font-serif tracking-[0.2em] uppercase shrink-0">
      <span className="text-[#d4af37] opacity-60">✧</span>
      <span className="mx-2 md:mx-4 tracking-[0.3em] font-semibold">{text}</span>
      <span className="text-[#d4af37] opacity-60">✧</span>
    </span>
    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#5a4e3d]"></div>
  </div>
);

export function EntryScreen({ onJoin }: { onJoin: (roomId: string, player: Omit<Player, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Masculino');
  const [charClass, setCharClass] = useState(CLASSES[0].id);
  const [roomId, setRoomId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Provide a default room if empty
    const finalRoom = roomId.trim() || 'aventura-1';
    
    const selectedClass = CLASSES.find(c => c.id === charClass);
    const className = selectedClass ? (gender === 'Feminino' ? selectedClass.nameF : selectedClass.nameM) : charClass;

    let stats;
    switch (charClass) {
      case 'guerreiro': stats = { str: 16, dex: 12, int: 8, def: 16, hp: 20, maxHp: 20, mp: 5, maxMp: 5 }; break;
      case 'mago': stats = { str: 8, dex: 14, int: 18, def: 10, hp: 12, maxHp: 12, mp: 20, maxMp: 20 }; break;
      case 'arqueiro': stats = { str: 12, dex: 18, int: 10, def: 14, hp: 15, maxHp: 15, mp: 10, maxMp: 10 }; break;
      case 'paladino': stats = { str: 14, dex: 10, int: 14, def: 18, hp: 22, maxHp: 22, mp: 12, maxMp: 12 }; break;
      case 'anao': stats = { str: 16, dex: 10, int: 8, def: 18, hp: 25, maxHp: 25, mp: 0, maxMp: 0 }; break;
      case 'ladrao': stats = { str: 8, dex: 18, int: 12, def: 10, hp: 14, maxHp: 14, mp: 10, maxMp: 10 }; break;
      case 'clerigo': stats = { str: 10, dex: 10, int: 16, def: 14, hp: 18, maxHp: 18, mp: 18, maxMp: 18 }; break;
      case 'bardo': stats = { str: 10, dex: 14, int: 14, def: 12, hp: 16, maxHp: 16, mp: 14, maxMp: 14 }; break;
      default: stats = { str: 10, dex: 10, int: 10, def: 10, hp: 15, maxHp: 15, mp: 10, maxMp: 10 };
    }

    onJoin(finalRoom, {
      name: name.trim(),
      gender,
      characterClass: className,
      stats
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a120b] via-[#050505] to-[#000000] flex items-center justify-center p-2 sm:p-4 md:p-8 font-sans relative overflow-x-hidden text-neutral-200 selection:bg-[#d4af37] selection:text-black">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-[#0a0a0c] border border-[#d4af37]/50 p-6 rounded-lg max-w-sm w-full relative shadow-[0_0_30px_rgba(0,0,0,0.8)]">
             <button 
               onClick={() => setShowSettings(false)}
               className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
             >
               <X size={20} />
             </button>
             <h3 className="text-[#d4af37] font-serif tracking-widest text-lg mb-4 uppercase">Configurações Base</h3>
             <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 block">Id da Sala</label>
             <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-[#111113] border border-[#2a2a2c] rounded-md px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all font-mono text-sm uppercase"
              placeholder="Ex: aventura-1"
              maxLength={12}
            />
            <p className="text-neutral-600 text-xs mt-2">Deixe em branco para usar a sala padrão inicial.</p>
           </div>
        </div>
      )}

      {/* Credits Modal */}
      {showCredits && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-[#0a0a0c] border border-[#d4af37]/50 p-8 rounded-lg max-w-sm w-full relative shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
             <button 
               onClick={() => setShowCredits(false)}
               className="absolute top-4 right-4 text-neutral-500 hover:text-[#d4af37] transition-colors"
             >
               <X size={20} />
             </button>
             <h3 className="text-[#d4af37] font-serif tracking-widest text-2xl mb-6 uppercase flex items-center gap-3">
               <span className="text-[#d4af37] opacity-60 text-sm">✧</span>
               Créditos
               <span className="text-[#d4af37] opacity-60 text-sm">✧</span>
             </h3>
             <div className="text-neutral-300 mb-6 font-sans">
               <p className="mb-2 text-sm uppercase tracking-widest text-neutral-500 font-semibold">Jogo criado por</p>
               <p className="text-2xl font-serif font-black text-white tracking-widest drop-shadow-md">André Gaicth</p>
             </div>
             <div className="w-1.5 h-1.5 rotate-45 bg-[#ba9b65] mb-2 opacity-60"></div>
             <p className="text-[#ba9b65] text-xs font-serif italic opacity-80">O destino está em suas mãos.</p>
           </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative w-full max-w-[1000px] bg-[#0a0a0c] lg:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-[#3a2e1d] flex flex-col items-center z-10 my-4">
        
        {/* Inner Gold Border Lines */}
        <div className="absolute inset-2 sm:inset-3 border border-[#3a2e1d]/40 pointer-events-none hidden sm:block"></div>
        
        {/* Inner Corners Decor */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-3 h-3 border-t border-l border-[#d4af37] hidden sm:block"></div>
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-3 h-3 border-t border-r border-[#d4af37] hidden sm:block"></div>
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-3 h-3 border-b border-l border-[#d4af37] hidden sm:block"></div>
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-3 h-3 border-b border-r border-[#d4af37] hidden sm:block"></div>

        {/* Top Floating Diamond */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-[#0a0a0c]">
           <div className="w-5 h-5 bg-[#7a0d0d] rotate-45 border border-[#d4af37] shadow-[0_0_20px_#900000]"></div>
        </div>

        {/* Titles */}
        <div className="flex flex-col items-center mt-6 sm:mt-10 px-4 w-full">
          <span className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-center tracking-[0.1em] text-[#d1c8b8] drop-shadow-md">
            ROLL YOUR
          </span>
          <span className="text-5xl sm:text-6xl md:text-8xl font-serif font-black text-center tracking-widest bg-gradient-to-b from-[#fff7e6] via-[#d4af37] to-[#7f5c12] bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,1)] uppercase mt-2">
            Destiny
          </span>
          
          <p className="text-center text-[#ba9b65] text-[10px] sm:text-xs md:text-sm mt-4 uppercase tracking-widest max-w-[90%] sm:max-w-lg mb-4 sm:mb-8">
            O destino está em suas mãos.<br className="hidden sm:block" />
            <span className="inline-block mt-1">Lendas serão escritas nas futuras aventuras.</span>
          </p>
          <div className="w-1.5 h-1.5 rotate-45 bg-[#ba9b65] mb-4 sm:mb-8 opacity-60"></div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleJoin} className="w-full flex flex-col items-center max-w-4xl px-4 sm:px-8 mb-8 sm:mb-12">
          
          {/* NOME DO PERSONAGEM */}
          <div className="w-full max-w-2xl">
            <Divider text="Nome do Personagem" />
            <div className="relative mt-4">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
              <input 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Digite o nome do seu herói..."
                className="w-full bg-[#111113] border border-[#2a2a2c] rounded-md py-4 pl-12 pr-4 text-[#e0e0e0] font-sans focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
                maxLength={24}
              />
            </div>
          </div>

          {/* GÊNERO */}
          <div className="w-full max-w-2xl">
            <Divider text="Gênero" />
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-4">
              <button
                type="button"
                onClick={() => setGender('Masculino')}
                className={`py-4 sm:py-5 rounded-md border flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                  gender === 'Masculino' 
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 shadow-[inset_0_0_20px_rgba(59,130,246,0.15)] shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'border-[#2a2a2c] bg-[#111113] hover:border-[#3b82f6]/50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={gender === 'Masculino' ? 'text-[#3b82f6]' : 'text-neutral-500'}><circle cx="10" cy="14" r="5"/><line x1="13.5" y1="10.5" x2="21" y2="3"/><line x1="16" y1="3" x2="21" y2="3"/><line x1="21" y1="3" x2="21" y2="8"/></svg>
                <span className={`text-xs sm:text-sm tracking-widest font-sans font-semibold uppercase ${gender === 'Masculino' ? 'text-[#3b82f6]' : 'text-neutral-500'}`}>MASCULINO</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('Feminino')}
                className={`py-4 sm:py-5 rounded-md border flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                  gender === 'Feminino' 
                    ? 'border-[#ec4899] bg-[#ec4899]/10 shadow-[inset_0_0_20px_rgba(236,72,153,0.15)] shadow-[0_0_15px_rgba(236,72,153,0.2)]' 
                    : 'border-[#2a2a2c] bg-[#111113] hover:border-[#ec4899]/50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={gender === 'Feminino' ? 'text-[#ec4899]' : 'text-neutral-500'}><circle cx="12" cy="10" r="5"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>
                <span className={`text-xs sm:text-sm tracking-widest font-sans font-semibold uppercase ${gender === 'Feminino' ? 'text-[#ec4899]' : 'text-neutral-500'}`}>FEMININO</span>
              </button>
            </div>
          </div>

          {/* CLASSE */}
          <div className="w-full mt-4">
            <Divider text="Classe" />
            <p className="text-center text-neutral-400 text-xs sm:text-sm mb-6 sm:mb-8 font-serif px-2">
              Escolha a classe que definirá seu caminho e habilidades.
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 w-full px-2">
              {CLASSES.map((c) => {
                const isSelected = charClass === c.id;
                const gradientStart = c.theme.split(' ').find(cls => cls.startsWith('from-'));
                
                return (
                  <button
                     key={c.id}
                     type="button"
                     onClick={() => setCharClass(c.id)}
                     className={`w-[calc(50%-0.3rem)] sm:w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] lg:w-[200px] h-[220px] sm:h-[260px] lg:h-[280px] relative border flex flex-col transition-all overflow-hidden bg-[#0c0c0e] hover:scale-[1.02] duration-300 rounded-[2px] group ${
                       isSelected 
                         ? c.theme + ' border-2 opacity-100 grayscale-0 z-10'
                         : 'border-[#2a2a2c] opacity-60 hover:opacity-100 grayscale-[40%] hover:grayscale-0 z-0 focus:outline-none'
                     }`}
                     style={isSelected ? { borderColor: c.textColor.replace('text-', '') } : {}}
                  >
                     {/* Pseudo-Portrait Background overlay */}
                     <div className={`absolute top-0 left-0 w-full h-[65%] bg-gradient-to-b ${gradientStart} to-transparent ${isSelected ? 'opacity-80' : 'opacity-40'} z-0`}></div>
                     
                     {/* Center Giant Icon for Abstract Portrait */}
                     <div className={`absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 opacity-[0.25] transition-opacity duration-300 group-hover:opacity-[0.4] ${isSelected ? c.textColor : 'text-neutral-600'} z-0`}>
                       {c.mainIcon}
                     </div>
                     
                     {/* Content Overlay */}
                     <div className="flex flex-col items-center justify-end h-full p-2 sm:p-4 pb-4 sm:pb-6 relative z-10 w-full space-y-2">
                       <span className={`text-[11px] sm:text-xs lg:text-[13px] tracking-widest font-serif font-bold uppercase z-10 drop-shadow-md pb-1 ${isSelected ? c.textColor : 'text-neutral-300'}`}>
                         {gender === 'Feminino' ? c.nameF : c.nameM}
                       </span>
                       
                       <div className="flex gap-1 sm:gap-2 z-10 pb-1">
                         <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#2a2a2c] bg-black/80 flex items-center justify-center text-neutral-400 ${isSelected ? 'border-'+c.textColor.split('-')[1]+'/50 text-'+c.textColor.split('-')[1] : ''}`}>
                           {c.icons[0]}
                         </div>
                         <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-[#2a2a2c] bg-black/80 flex items-center justify-center text-neutral-400 ${isSelected ? 'border-'+c.textColor.split('-')[1]+'/50 text-'+c.textColor.split('-')[1] : ''}`}>
                           {c.icons[1]}
                         </div>
                       </div>
                       
                       <p className="text-[9px] sm:text-[10px] lg:text-xs text-center leading-tight lg:leading-normal text-neutral-400 font-sans px-1 z-10 flex items-center">
                          {c.description}
                       </p>
                     </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* COMEÇAR AVENTURA */}
          <div className="mt-12 sm:mt-16 flex justify-center w-full z-20">
            <button 
              type="submit" 
              className="relative group overflow-hidden w-full max-w-sm rounded-[2px]"
            >
              <div className="absolute inset-0 bg-[#5c0a0a] blur-xl group-hover:bg-[#8a0a0a] transition duration-500 opacity-60" />
              <div className="relative border-y-2 border-[#d4af37] bg-gradient-to-r from-[#210202] via-[#5c0a0a] to-[#210202] px-6 py-4 sm:px-12 flex items-center justify-center gap-3 sm:gap-4 shadow-[0_0_20px_rgba(150,0,0,0.5)] cursor-pointer">
                <span className="text-[#d4af37] text-sm sm:text-lg">✧</span>
                <span className="text-base sm:text-lg font-serif font-bold tracking-widest text-[#fdfbf7] whitespace-nowrap drop-shadow-md">
                  COMEÇAR AVENTURA
                </span>
                <span className="text-[#d4af37] text-sm sm:text-lg">✧</span>
              </div>
            </button>
          </div>

        </form>

        {/* Bottom Options inside the frame to match layout perfectly */}
        <div className="flex w-full justify-between items-end px-4 sm:px-8 pb-4 sm:pb-6 relative z-20">
          <button 
            type="button" 
            onClick={() => setShowSettings(true)}
            className="text-neutral-500 hover:text-neutral-300 transition-colors bg-[#0f0f11] p-2 sm:p-3 rounded-full border border-[#2a2a2c] hover:border-[#4a4a4c] shadow-lg"
          >
            <Settings size={20} />
          </button>
          <button 
            type="button" 
            onClick={() => setShowCredits(true)}
            className="flex items-center gap-2 hover:text-neutral-300 transition-colors uppercase tracking-widest text-[10px] sm:text-xs font-serif bg-[#0f0f11] px-3 sm:px-4 py-2 sm:py-3 rounded-[4px] border border-[#2a2a2c] hover:border-[#d4af37]/40 shadow-lg text-neutral-500 hover:text-[#d4af37]"
          >
            <BookOpen size={16} />
            <span>Créditos</span>
          </button>
        </div>

      </div>
    </div>
  );
}
