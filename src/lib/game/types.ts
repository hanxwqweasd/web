// ============================================
// Star Dominion — Core Type Definitions
// ============================================

export type ResourceType = 'energy' | 'minerals' | 'bioMatter' | 'crystals';
export type ModuleType = 'mining' | 'processing' | 'defense' | 'research' | 'habitat' | 'hangar';
export type FactionId = 'traders' | 'military' | 'scientists';
export type TechBranch = 'military' | 'engineering' | 'biological' | 'psycho';
export type ShipClass = 'fighter' | 'frigate' | 'cruiser' | 'dreadnought';
export type CombatTactic = 'aggressive' | 'defensive' | 'recon';
export type RoomId = 'bridge' | 'engineering' | 'bioLab' | 'hangar' | 'bar' | 'serverRoom' | 'corridor';
export type GameScreen = 'station' | 'room' | 'techTree' | 'fleet' | 'combat' | 'map' | 'minigames' | 'shop' | 'quests' | 'profile' | 'leaderboard' | 'admin';

export interface Resources {
  energy: number;
  minerals: number;
  bioMatter: number;
  crystals: number;
}

export interface ResourceRates {
  energy: number;
  minerals: number;
  bioMatter: number;
  crystals: number;
}

export interface ModuleDef {
  id: string;
  name: string;
  type: ModuleType;
  description: string;
  icon: string;
  baseCost: Partial<Resources>;
  costMultiplier: number;
  baseProduction: Partial<ResourceRates>;
  productionPerLevel: Partial<ResourceRates>;
  maxLevel: number;
  buildTime: number; // seconds
  buildTimePerLevel: number;
}

export interface StationModule {
  id: string;
  defId: string;
  level: number;
  building: boolean;
  buildStartTime: number | null;
  buildEndTime: number | null;
  health: number;
  maxHealth: number;
}

export interface TechDef {
  id: string;
  name: string;
  branch: TechBranch;
  description: string;
  cost: number; // science points
  crystalCost: number;
  prerequisites: string[];
  tier: number;
  unlocks: string; // description of what it unlocks
  icon: string;
}

export interface ShipDef {
  id: string;
  name: string;
  class: ShipClass;
  attack: number;
  defense: number;
  speed: number;
  cost: Partial<Resources>;
  buildTime: number;
  description: string;
  icon: string;
  unlockedByTech: string | null;
}

export interface Ship {
  id: string;
  defId: string;
  name: string;
  quantity: number;
  assignedSquadron: string | null;
}

export interface Squadron {
  id: string;
  name: string;
  shipIds: string[];
  tactic: CombatTactic;
}

export interface CombatResult {
  id: string;
  timestamp: number;
  opponent: string;
  opponentLevel: number;
  victory: boolean;
  resourcesGained: Partial<Resources>;
  shipsLost: number;
  ratingChange: number;
}

export interface DailyQuest {
  id: string;
  description: string;
  target: number;
  progress: number;
  reward: { shards: number; resources?: Partial<Resources> };
  completed: boolean;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: number | null;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockCost: Partial<Resources> | null;
  bgColor: string;
  accentColor: string;
  ambientDesc: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number; // Stars
  category: 'boost' | 'cosmetic' | 'slot' | 'expedition' | 'subscription';
  icon: string;
  effect: string;
}

export interface MapNode {
  id: string;
  name: string;
  type: 'station' | 'anomaly' | 'pirate' | 'neutral' | 'empty';
  x: number;
  y: number;
  owner: string | null;
  level: number;
  resources: Partial<Resources>;
  danger: number; // 1-10
  discovered: boolean;
}

export interface GameState {
  // Player
  captainName: string;
  faction: FactionId | null;
  factionRank: number;
  rating: number;
  level: number;

  // Resources
  resources: Resources;
  resourceRates: ResourceRates;
  lastTick: number;
  lastCollectionTimes: Record<string, number>;

  // Station
  stationName: string;
  stationLevel: number;
  moduleSlots: number;
  modules: StationModule[];

  // Tech
  researchedTechs: string[];
  sciencePoints: number;
  scienceRate: number;

  // Fleet
  ships: Ship[];
  squadrons: Squadron[];

  // Combat
  combatLog: CombatResult[];
  pvpWins: number;
  pvpLosses: number;

  // Rooms
  unlockedRooms: RoomId[];

  // Map
  mapNodes: MapNode[];

  // Progression
  achievements: string[];
  dailyQuests: DailyQuest[];
  starShards: number;
  totalMineralsMined: number;
  totalBattlesWon: number;
  totalEnemiesDefeated: number;

  // Mini-games
  lastScanTime: number;
  lastAsteroidEvent: number;
  scanCooldown: number; // seconds

  // UI
  currentScreen: GameScreen;
  currentRoom: RoomId | null;
  selectedModule: string | null;
  selectedTech: string | null;
  showCombatResults: boolean;
  notification: string | null;

  // Tutorial
  tutorialStep: number;
  tutorialCompleted: boolean;
}

// Actions
export type GameAction =
  | { type: 'TICK'; now: number }
  | { type: 'COLLECT_RESOURCE'; moduleId: string }
  | { type: 'BUILD_MODULE'; defId: string }
  | { type: 'UPGRADE_MODULE'; moduleId: string; useStars?: boolean }
  | { type: 'RESEARCH_TECH'; techId: string }
  | { type: 'BUILD_SHIP'; defId: string }
  | { type: 'CREATE_SQUADRON'; name: string }
  | { type: 'ASSIGN_SHIP_TO_SQUADRON'; shipId: string; squadronId: string }
  | { type: 'SET_TACTIC'; squadronId: string; tactic: CombatTactic }
  | { type: 'ATTACK_PVE'; mapNodeId: string; squadronId: string }
  | { type: 'ATTACK_PVP'; targetStation: string; squadronId: string }
  | { type: 'BUY_SHOP_ITEM'; itemId: string }
  | { type: 'UNLOCK_ROOM'; roomId: RoomId }
  | { type: 'COMPLETE_SCAN'; reward: number }
  | { type: 'DEFEND_ASTEROIDS'; success: boolean }
  | { type: 'CLAIM_QUEST'; questId: string }
  | { type: 'SELECT_FACTION'; factionId: FactionId }
  | { type: 'SET_SCREEN'; screen: GameScreen }
  | { type: 'SET_ROOM'; room: RoomId | null }
  | { type: 'SELECT_MODULE'; moduleId: string | null }
  | { type: 'DISMISS_NOTIFICATION' }
  | { type: 'ADVANCE_TUTORIAL' }
  | { type: 'SPEED_UP_BUILD'; moduleId: string };