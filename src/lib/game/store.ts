import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, StationModule, Ship, Squadron, CombatResult, MapNode } from './types';
import { MODULE_DEFS, TECH_DEFS, SHIP_DEFS, ROOM_DEFS, DEFAULT_MAP_NODES, generateDailyQuests, COLLECTION_COOLDOWN, SCAN_COOLDOWN } from './constants';
import { v4 as uuid } from 'uuid';

function calculateModuleProduction(mod: StationModule): Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>> {
  const def = MODULE_DEFS.find(d => d.id === mod.defId);
  if (!def || mod.building) return {};
  const production: Record<string, number> = {};
  for (const [res, base] of Object.entries(def.baseProduction)) {
    production[res] = (base || 0) + (def.productionPerLevel[res as keyof typeof def.productionPerLevel] || 0) * (mod.level - 1);
  }
  return production as Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>>;
}

function getModuleCost(defId: string, level: number): Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>> {
  const def = MODULE_DEFS.find(d => d.id === defId);
  if (!def) return {};
  const cost: Record<string, number> = {};
  for (const [res, base] of Object.entries(def.baseCost)) {
    cost[res] = Math.floor((base || 0) * Math.pow(def.costMultiplier, level - 1));
  }
  return cost as Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>>;
}

function getBuildTime(defId: string, level: number): number {
  const def = MODULE_DEFS.find(d => d.id === defId);
  if (!def) return 60;
  return def.buildTime + def.buildTimePerLevel * (level - 1);
}

const initialQuests = generateDailyQuests();

const initialState: GameState = {
  captainName: 'Капитан',
  faction: null,
  factionRank: 0,
  rating: 1000,
  level: 1,
  resources: { energy: 500, minerals: 300, bioMatter: 100, crystals: 50 },
  resourceRates: { energy: 0, minerals: 0, bioMatter: 0, crystals: 0 },
  lastTick: Date.now(),
  lastCollectionTimes: {},
  stationName: 'Форпост-7',
  stationLevel: 1,
  moduleSlots: 6,
  modules: [],
  researchedTechs: [],
  sciencePoints: 0,
  scienceRate: 0,
  ships: [],
  squadrons: [],
  combatLog: [],
  pvpWins: 0,
  pvpLosses: 0,
  unlockedRooms: ['bridge', 'engineering', 'bioLab', 'hangar'],
  mapNodes: DEFAULT_MAP_NODES.map(n => ({ ...n })),
  achievements: [],
  dailyQuests: initialQuests,
  starShards: 0,
  totalMineralsMined: 0,
  totalBattlesWon: 0,
  totalEnemiesDefeated: 0,
  lastScanTime: 0,
  lastAsteroidEvent: Date.now(),
  scanCooldown: SCAN_COOLDOWN,
  currentScreen: 'station',
  currentRoom: null,
  selectedModule: null,
  selectedTech: null,
  showCombatResults: false,
  notification: null,
  tutorialStep: 0,
  tutorialCompleted: false,
};

interface GameStore extends GameState {
  // Tick
  tick: () => void;

  // Resources
  collectResource: (moduleId: string) => { success: boolean; amount: Record<string, number>; message: string };
  canAfford: (cost: Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>>) => boolean;
  spendResources: (cost: Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>>) => void;

  // Modules
  buildModule: (defId: string) => { success: boolean; message: string };
  upgradeModule: (moduleId: string) => { success: boolean; message: string };
  speedUpBuild: (moduleId: string) => { success: boolean; message: string };
  getModuleCost: (defId: string, level: number) => Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>>;
  getBuildTimeRemaining: (moduleId: string) => number;

  // Tech
  researchTech: (techId: string) => { success: boolean; message: string };
  canResearch: (techId: string) => boolean;

  // Fleet
  buildShip: (defId: string) => { success: boolean; message: string };
  createSquadron: (name: string) => Squadron;
  assignShipToSquadron: (shipId: string, squadronId: string) => void;
  setTactic: (squadronId: string, tactic: 'aggressive' | 'defensive' | 'recon') => void;

  // Combat
  attackNode: (nodeId: string, squadronId: string) => CombatResult | null;
  getFleetPower: (squadronId: string) => { attack: number; defense: number; speed: number };

  // Map
  discoverNode: (nodeId: string) => void;
  getDiscoveredNodes: () => MapNode[];

  // Rooms
  unlockRoom: (roomId: string) => { success: boolean; message: string };

  // Shop
  buyShopItem: (itemId: string) => { success: boolean; message: string };

  // Quests
  claimQuest: (questId: string) => { success: boolean; message: string };
  updateQuestProgress: (questId: string, amount: number) => void;

  // Mini-games
  completeScan: (reward: number) => void;
  defendAsteroids: (success: boolean) => void;

  // UI
  setScreen: (screen: GameState['currentScreen']) => void;
  setRoom: (room: GameState['currentRoom']) => void;
  selectModule: (id: string | null) => void;
  dismissNotification: () => void;
  setNotification: (msg: string) => void;

  // Faction
  selectFaction: (factionId: 'traders' | 'military' | 'scientists') => void;

  // Tutorial
  advanceTutorial: () => void;

  // Profile
  setCaptainName: (name: string) => void;

  // Reset
  resetGame: () => void;

  // Recalculate
  recalculateRates: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      tick: () => {
        const state = get();
        const now = Date.now();
        const elapsed = (now - state.lastTick) / 60000; // minutes

        if (elapsed <= 0) return;

        const newResources = { ...state.resources };

        // Add passive production
        for (const mod of state.modules) {
          if (mod.building) {
            // Check if build completed
            if (mod.buildEndTime && now >= mod.buildEndTime) {
              const updatedModules = state.modules.map(m =>
                m.id === mod.id ? { ...m, building: false, buildStartTime: null, buildEndTime: null } : m
              );
              const modDef = MODULE_DEFS.find(d => d.id === mod.defId);
              set({ modules: updatedModules, notification: `✨ ${modDef?.name || 'Модуль'} построен!` });
              continue;
            }
          }
          const production = calculateModuleProduction(mod);
          for (const [res, rate] of Object.entries(production)) {
            newResources[res as keyof typeof newResources] += (rate || 0) * elapsed;
          }
        }

        // Science points from laboratories
        const labModules = state.modules.filter(m => {
          const def = MODULE_DEFS.find(d => d.id === m.defId);
          return def?.type === 'research' && !m.building;
        });
        let scienceRate = 0;
        for (const mod of labModules) {
          scienceRate += 2 + mod.level;
        }
        const newScience = state.sciencePoints + scienceRate * elapsed;

        // Energy passive consumption (1 per minute per module)
        const energyDrain = state.modules.length * 0.5 * elapsed;
        newResources.energy = Math.max(0, newResources.energy - energyDrain);

        set({
          resources: {
            energy: Math.floor(newResources.energy),
            minerals: Math.floor(newResources.minerals),
            bioMatter: Math.floor(newResources.bioMatter),
            crystals: Math.floor(newResources.crystals * 10) / 10,
          },
          sciencePoints: Math.floor(newScience),
          scienceRate,
          lastTick: now,
        });

        // Recalculate rates
        get().recalculateRates();
      },

      recalculateRates: () => {
        const state = get();
        const rates = { energy: 0, minerals: 0, bioMatter: 0, crystals: 0 };
        for (const mod of state.modules) {
          if (mod.building) continue;
          const production = calculateModuleProduction(mod);
          for (const [res, rate] of Object.entries(production)) {
            rates[res as keyof typeof rates] += (rate || 0);
          }
        }
        rates.energy -= state.modules.length * 0.5;
        set({ resourceRates: rates });
      },

      canAfford: (cost) => {
        const res = get().resources;
        for (const [key, value] of Object.entries(cost)) {
          if (value && (res[key as keyof typeof res] || 0) < value) return false;
        }
        return true;
      },

      spendResources: (cost) => {
        const newRes = { ...get().resources };
        for (const [key, value] of Object.entries(cost)) {
          if (value) newRes[key as keyof typeof newRes] -= value;
        }
        set({ resources: newRes });
      },

      collectResource: (moduleId) => {
        const state = get();
        const mod = state.modules.find(m => m.id === moduleId);
        if (!mod || mod.building) return { success: false, amount: {}, message: 'Модуль не найден или строится' };

        const lastCol = state.lastCollectionTimes[moduleId] || 0;
        if (Date.now() - lastCol < COLLECTION_COOLDOWN) {
          const remaining = Math.ceil((COLLECTION_COOLDOWN - (Date.now() - lastCol)) / 60000);
          return { success: false, amount: {}, message: `Ручной сбор доступен через ${remaining} мин.` };
        }

        const production = calculateModuleProduction(mod);
        const amount: Record<string, number> = {};
        const newRes = { ...state.resources };
        const newTimes = { ...state.lastCollectionTimes };

        for (const [res, rate] of Object.entries(production)) {
          const bonus = Math.floor((rate || 0) * 3 * 5); // 3x bonus for 5 min worth
          amount[res] = bonus;
          newRes[res as keyof typeof newRes] += bonus;
        }

        newTimes[moduleId] = Date.now();

        if (Object.keys(amount).length === 0) {
          return { success: false, amount: {}, message: 'Этот модуль не производит ресурсы' };
        }

        set({ resources: newRes, lastCollectionTimes: newTimes });
        return { success: true, amount, message: 'Собрано!' };
      },

      buildModule: (defId) => {
        const state = get();
        if (state.modules.length >= state.moduleSlots) {
          return { success: false, message: 'Все слоты заняты! Расширьте станцию.' };
        }

        const def = MODULE_DEFS.find(d => d.id === defId);
        if (!def) return { success: false, message: 'Модуль не найден' };

        const cost = getModuleCost(defId, 1);
        if (!get().canAfford(cost)) {
          return { success: false, message: 'Недостаточно ресурсов!' };
        }

        get().spendResources(cost);

        const now = Date.now();
        const buildTime = getBuildTime(defId, 1);
        const newModule: StationModule = {
          id: uuid(),
          defId,
          level: 1,
          building: true,
          buildStartTime: now,
          buildEndTime: now + buildTime * 1000,
          health: 100,
          maxHealth: 100,
        };

        set({ modules: [...state.modules, newModule] });
        get().recalculateRates();

        return { success: true, message: `${def.name} начал строиться! (${buildTime}с)` };
      },

      upgradeModule: (moduleId) => {
        const state = get();
        const mod = state.modules.find(m => m.id === moduleId);
        if (!mod) return { success: false, message: 'Модуль не найден' };
        if (mod.building) return { success: false, message: 'Модуль уже строится' };

        const def = MODULE_DEFS.find(d => d.id === mod.defId);
        if (!def) return { success: false, message: 'Определение модуля не найдено' };
        if (mod.level >= def.maxLevel) return { success: false, message: 'Максимальный уровень!' };

        const nextLevel = mod.level + 1;
        const cost = getModuleCost(mod.defId, nextLevel);
        if (!get().canAfford(cost)) {
          return { success: false, message: 'Недостаточно ресурсов!' };
        }

        get().spendResources(cost);

        const now = Date.now();
        const buildTime = getBuildTime(mod.defId, nextLevel);

        const updatedModules = state.modules.map(m =>
          m.id === moduleId
            ? { ...m, building: true, buildStartTime: now, buildEndTime: now + buildTime * 1000 }
            : m
        );

        set({ modules: updatedModules });
        get().recalculateRates();

        return { success: true, message: `${def.name} улучшается до ур. ${nextLevel}!` };
      },

      speedUpBuild: (moduleId) => {
        const state = get();
        const mod = state.modules.find(m => m.id === moduleId);
        if (!mod || !mod.building) return { success: false, message: 'Нет активной постройки' };

        // Crystal cost: 1 crystal per 60 seconds remaining, minimum 1
        const remaining = mod.buildEndTime ? Math.max(0, mod.buildEndTime - Date.now()) : 0;
        const crystalCost = Math.max(1, Math.ceil(remaining / 60000));

        if (state.resources.crystals < crystalCost) {
          return { success: false, message: `Недостаточно кристаллов (нужно ${crystalCost})` };
        }

        const updatedModules = state.modules.map(m =>
          m.id === moduleId
            ? { ...m, building: false, buildStartTime: null, buildEndTime: null }
            : m
        );

        set({
          modules: updatedModules,
          resources: { ...state.resources, crystals: state.resources.crystals - crystalCost },
        });
        get().recalculateRates();

        return { success: true, message: `Постройка завершена! -${crystalCost} кристаллов` };
      },

      getModuleCost,
      getBuildTimeRemaining: (moduleId) => {
        const mod = get().modules.find(m => m.id === moduleId);
        if (!mod || !mod.buildEndTime) return 0;
        return Math.max(0, mod.buildEndTime - Date.now());
      },

      researchTech: (techId) => {
        const state = get();
        if (state.researchedTechs.includes(techId)) {
          return { success: false, message: 'Технология уже исследована' };
        }

        const tech = TECH_DEFS.find(t => t.id === techId);
        if (!tech) return { success: false, message: 'Технология не найдена' };

        if (!get().canResearch(techId)) {
          return { success: false, message: 'Не выполнены prerequisites!' };
        }

        if (state.sciencePoints < tech.cost) {
          return { success: false, message: 'Недостаточно очков науки!' };
        }
        if (state.resources.crystals < tech.crystalCost) {
          return { success: false, message: 'Недостаточно кристаллов!' };
        }

        set({
          researchedTechs: [...state.researchedTechs, techId],
          sciencePoints: state.sciencePoints - tech.cost,
          resources: { ...state.resources, crystals: state.resources.crystals - tech.crystalCost },
        });

        return { success: true, message: `${tech.name} исследована!` };
      },

      canResearch: (techId) => {
        const state = get();
        const tech = TECH_DEFS.find(t => t.id === techId);
        if (!tech) return false;
        return tech.prerequisites.every(p => state.researchedTechs.includes(p));
      },

      buildShip: (defId) => {
        const state = get();
        const def = SHIP_DEFS.find(s => s.id === defId);
        if (!def) return { success: false, message: 'Корабль не найден' };

        if (def.unlockedByTech && !state.researchedTechs.includes(def.unlockedByTech)) {
          return { success: false, message: 'Технология не исследована!' };
        }

        if (!get().canAfford(def.cost)) {
          return { success: false, message: 'Недостаточно ресурсов!' };
        }

        get().spendResources(def.cost);

        const existing = state.ships.find(s => s.defId === defId);
        if (existing) {
          const updatedShips = state.ships.map(s =>
            s.defId === defId ? { ...s, quantity: s.quantity + 1 } : s
          );
          set({ ships: updatedShips });
        } else {
          const newShip: Ship = { id: uuid(), defId, name: def.name, quantity: 1, assignedSquadron: null };
          set({ ships: [...state.ships, newShip] });
        }

        return { success: true, message: `${def.name} построен!` };
      },

      createSquadron: (name) => {
        const squadron: Squadron = { id: uuid(), name, shipIds: [], tactic: 'aggressive' };
        set({ squadrons: [...get().squadrons, squadron] });
        return squadron;
      },

      assignShipToSquadron: (shipId, squadronId) => {
        const state = get();
        const updatedShips = state.ships.map(s =>
          s.id === shipId ? { ...s, assignedSquadron: squadronId } : { ...s, assignedSquadron: s.id === shipId ? squadronId : s.assignedSquadron }
        );
        const squadron = state.squadrons.find(sq => sq.id === squadronId);
        const updatedSquadrons = state.squadrons.map(sq =>
          sq.id === squadronId && !sq.shipIds.includes(shipId)
            ? { ...sq, shipIds: [...sq.shipIds, shipId] }
            : sq
        );
        set({ ships: updatedShips, squadrons: updatedSquadrons });
      },

      setTactic: (squadronId, tactic) => {
        const updatedSquadrons = get().squadrons.map(sq =>
          sq.id === squadronId ? { ...sq, tactic } : sq
        );
        set({ squadrons: updatedSquadrons });
      },

      getFleetPower: (squadronId) => {
        const state = get();
        const squadron = state.squadrons.find(sq => sq.id === squadronId);
        if (!squadron) return { attack: 0, defense: 0, speed: 0 };

        let attack = 0, defense = 0, speed = 0;
        for (const shipId of squadron.shipIds) {
          const ship = state.ships.find(s => s.id === shipId);
          if (!ship) continue;
          const def = SHIP_DEFS.find(d => d.id === ship.defId);
          if (!def) continue;
          attack += def.attack * ship.quantity;
          defense += def.defense * ship.quantity;
          speed += def.speed * ship.quantity;
        }
        return { attack, defense, speed: squadron.shipIds.length > 0 ? speed / squadron.shipIds.length : 0 };
      },

      attackNode: (nodeId, squadronId) => {
        const state = get();
        const node = state.mapNodes.find(n => n.id === nodeId);
        if (!node) return null;

        const squadron = state.squadrons.find(sq => sq.id === squadronId);
        if (!squadron || squadron.shipIds.length === 0) return null;

        const power = get().getFleetPower(squadronId);
        const tacticMods = { aggressive: { atk: 1.2, def: 0.9 }, defensive: { atk: 0.9, def: 1.2 }, recon: { atk: 1.0, def: 1.0 } };
        const mod = tacticMods[squadron.tactic];

        const playerPower = power.attack * mod.atk + power.defense * mod.def;
        const enemyPower = node.level * 50 + node.danger * 30;

        const victory = playerPower > enemyPower * (0.7 + Math.random() * 0.6);

        const result: CombatResult = {
          id: uuid(),
          timestamp: Date.now(),
          opponent: node.name,
          opponentLevel: node.level,
          victory,
          resourcesGained: victory ? (node.resources || {}) : {},
          shipsLost: victory ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3) + 1,
          ratingChange: victory ? node.level * 15 : -node.level * 10,
        };

        const newResources = { ...state.resources };
        if (victory) {
          for (const [res, val] of Object.entries(result.resourcesGained)) {
            newResources[res as keyof typeof newResources] += val || 0;
          }
        }

        set({
          combatLog: [result, ...state.combatLog].slice(0, 50),
          resources: newResources,
          rating: Math.max(0, state.rating + result.ratingChange),
          pvpWins: victory ? state.pvpWins + 1 : state.pvpWins,
          pvpLosses: !victory ? state.pvpLosses + 1 : state.pvpLosses,
          totalBattlesWon: victory ? state.totalBattlesWon + 1 : state.totalBattlesWon,
          totalEnemiesDefeated: victory ? state.totalEnemiesDefeated + 1 : state.totalEnemiesDefeated,
          showCombatResults: true,
          notification: victory ? `⚔️ Победа над ${node.name}! +${result.ratingChange} рейтинга` : `💀 Поражение у ${node.name}. ${result.ratingChange} рейтинга`,
        });

        return result;
      },

      discoverNode: (nodeId) => {
        const state = get();
        const updatedNodes = state.mapNodes.map(n =>
          n.id === nodeId ? { ...n, discovered: true } : n
        );
        set({ mapNodes: updatedNodes });
      },

      getDiscoveredNodes: () => {
        return get().mapNodes.filter(n => n.discovered);
      },

      unlockRoom: (roomId) => {
        const state = get();
        if (state.unlockedRooms.includes(roomId)) {
          return { success: false, message: 'Комната уже открыта' };
        }

        const room = ROOM_DEFS.find(r => r.id === roomId);
        if (!room?.unlockCost) {
          // Secret corridor - unlocked by reaching station level 3
          if (roomId === 'corridor' && state.stationLevel >= 3) {
            set({ unlockedRooms: [...state.unlockedRooms, roomId] });
            return { success: true, message: '🔔 Аварийный коридор открыт!' };
          }
          return { success: false, message: 'Невозможно открыть' };
        }

        if (!get().canAfford(room.unlockCost)) {
          return { success: false, message: 'Недостаточно ресурсов!' };
        }

        get().spendResources(room.unlockCost);
        set({ unlockedRooms: [...state.unlockedRooms, roomId] });
        return { success: true, message: `${room.name} открыт!` };
      },

      buyShopItem: (itemId) => {
        // In a real app, this would call Telegram.WebApp.openInvoice()
        // For the prototype, we simulate with starShards
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Предмет не найден' };

        if (get().starShards < item.cost) {
          return { success: false, message: 'Недостаточно Звёздных осколков!' };
        }

        set({
          starShards: get().starShards - item.cost,
          notification: `🛒 ${item.name} приобретён!`,
        });

        if (item.effect === 'pack_minerals') {
          set({ resources: { ...get().resources, minerals: get().resources.minerals + 5000 } });
        } else if (item.effect === 'pack_energy') {
          set({ resources: { ...get().resources, energy: get().resources.energy + 5000 } });
        }

        return { success: true, message: `${item.name} приобретён!` };
      },

      claimQuest: (questId) => {
        const state = get();
        const quest = state.dailyQuests.find(q => q.id === questId);
        if (!quest || !quest.completed || quest.claimed) {
          return { success: false, message: 'Награда недоступна' };
        }

        const newRes = { ...state.resources };
        if (quest.reward.resources) {
          for (const [res, val] of Object.entries(quest.reward.resources)) {
            newRes[res as keyof typeof newRes] += val || 0;
          }
        }

        const updatedQuests = state.dailyQuests.map(q =>
          q.id === questId ? { ...q, claimed: true } : q
        );

        set({
          dailyQuests: updatedQuests,
          resources: newRes,
          starShards: state.starShards + quest.reward.shards,
          notification: `🏆 Награда получена: +${quest.reward.shards} осколков!`,
        });

        return { success: true, message: 'Награда получена!' };
      },

      updateQuestProgress: (questId, amount) => {
        const state = get();
        const updatedQuests = state.dailyQuests.map(q => {
          if (q.id === questId && !q.completed) {
            const newProgress = q.progress + amount;
            const completed = newProgress >= q.target;
            return { ...q, progress: Math.min(newProgress, q.target), completed };
          }
          return q;
        });
        set({ dailyQuests: updatedQuests });
      },

      completeScan: (reward) => {
        const state = get();
        set({
          lastScanTime: Date.now(),
          resources: { ...state.resources, crystals: state.resources.crystals + reward },
          starShards: state.starShards + 10,
          notification: `🔍 Сканирование завершено! +${reward} кристаллов, +10 осколков`,
        });
        get().updateQuestProgress('scan_sector', 1);
      },

      defendAsteroids: (success) => {
        const state = get();
        if (success) {
          const bonus = 200 + Math.floor(Math.random() * 300);
          set({
            resources: { ...state.resources, minerals: state.resources.minerals + bonus },
            notification: `☄️ Астероиды уничтожены! +${bonus} минералов`,
          });
        } else {
          const modules = [...state.modules];
          if (modules.length > 0) {
            const target = modules[Math.floor(Math.random() * modules.length)];
            const updatedModules = modules.map(m =>
              m.id === target.id ? { ...m, health: Math.max(0, m.health - 20) } : m
            );
            set({
              modules: updatedModules,
              notification: '💥 Астероиды повредили модуль! (-20 HP)',
            });
          }
        }
      },

      setScreen: (screen) => set({ currentScreen: screen, currentRoom: screen === 'room' ? get().currentRoom : null }),
      setRoom: (room) => set({ currentRoom: room, currentScreen: 'room' }),
      selectModule: (id) => set({ selectedModule: id }),
      dismissNotification: () => set({ notification: null }),
      setNotification: (msg) => set({ notification: msg }),

      selectFaction: (factionId) => {
        if (get().faction) return;
        set({ faction: factionId, factionRank: 1 });
        get().setNotification(`Вы присоединились к фракции ${factionId === 'traders' ? 'Торговцев' : factionId === 'military' ? 'Военных' : 'Учёных'}!`);
      },

      advanceTutorial: () => {
        const state = get();
        const next = state.tutorialStep + 1;
        if (next >= 5) {
          set({ tutorialStep: next, tutorialCompleted: true });
        } else {
          set({ tutorialStep: next });
        }
      },

      setCaptainName: (name) => set({ captainName: name }),

      resetGame: () => {
        set({ ...initialState, lastTick: Date.now(), dailyQuests: generateDailyQuests(), mapNodes: DEFAULT_MAP_NODES.map(n => ({ ...n })) });
      },
    }),
    {
      name: 'star-dominion-save',
      partialize: (state) => ({
        captainName: state.captainName,
        faction: state.faction,
        factionRank: state.factionRank,
        rating: state.rating,
        level: state.level,
        resources: state.resources,
        lastTick: state.lastTick,
        lastCollectionTimes: state.lastCollectionTimes,
        stationName: state.stationName,
        stationLevel: state.stationLevel,
        moduleSlots: state.moduleSlots,
        modules: state.modules,
        researchedTechs: state.researchedTechs,
        sciencePoints: state.sciencePoints,
        ships: state.ships,
        squadrons: state.squadrons,
        combatLog: state.combatLog,
        pvpWins: state.pvpWins,
        pvpLosses: state.pvpLosses,
        unlockedRooms: state.unlockedRooms,
        mapNodes: state.mapNodes,
        achievements: state.achievements,
        dailyQuests: state.dailyQuests,
        starShards: state.starShards,
        totalMineralsMined: state.totalMineralsMined,
        totalBattlesWon: state.totalBattlesWon,
        totalEnemiesDefeated: state.totalEnemiesDefeated,
        lastScanTime: state.lastScanTime,
        tutorialStep: state.tutorialStep,
        tutorialCompleted: state.tutorialCompleted,
      }),
    }
  )
);