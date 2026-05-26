export type PlayerStats = {
  str: number;
  dex: number;
  int: number;
  def: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
};

export type Player = {
  id: string;
  name: string;
  gender: string;
  characterClass: string;
  stats?: PlayerStats;
  inventory?: string[];
  skills?: string[];
};

export type ChatMessage = {

  id: string;
  sender: string;
  senderName: string;
  text: string;
  type: 'system' | 'player' | 'dm' | 'roll';
  rollResult?: number;
  diceType?: number;
};

export type Enemy = {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  intent?: string;
};

export type RoomState = {
  id: string;
  players: Record<string, Player>;
  chatHistory: ChatMessage[];
  isStarted: boolean;
  enemy: Enemy;
};
