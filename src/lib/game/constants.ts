import type { ModuleDef, TechDef, ShipDef, RoomDef, ShopItem, MapNode, DailyQuest, Achievement } from './types';

// ============================================
// Module Definitions
// ============================================
export const MODULE_DEFS: ModuleDef[] = [
  {
    id: 'energy_generator',
    name: 'Энергоядро',
    type: 'mining',
    description: 'Реактор холодного синтеза, генерирующий энергию для всех систем станции.',
    icon: 'Zap',
    baseCost: { minerals: 100 },
    costMultiplier: 1.8,
    baseProduction: { energy: 5 },
    productionPerLevel: { energy: 3 },
    maxLevel: 10,
    buildTime: 60,
    buildTimePerLevel: 30,
  },
  {
    id: 'mining_laser',
    name: 'Добывающий лазер',
    type: 'mining',
    description: 'Орбитальный лазер для добычи минералов из астероидов.',
    icon: 'Pickaxe',
    baseCost: { energy: 120, minerals: 80 },
    costMultiplier: 1.9,
    baseProduction: { minerals: 4 },
    productionPerLevel: { minerals: 2.5 },
    maxLevel: 10,
    buildTime: 90,
    buildTimePerLevel: 35,
  },
  {
    id: 'bio_reactor',
    name: 'Биореактор',
    type: 'mining',
    description: 'Культиватор биоматерии из органических образцов и водорослей.',
    icon: 'Leaf',
    baseCost: { energy: 150, minerals: 60 },
    costMultiplier: 1.7,
    baseProduction: { bioMatter: 3 },
    productionPerLevel: { bioMatter: 2 },
    maxLevel: 10,
    buildTime: 75,
    buildTimePerLevel: 25,
  },
  {
    id: 'refinery',
    name: 'Перерабатывающий комплекс',
    type: 'processing',
    description: 'Превращает сырьё в очищенные материалы. Увеличивает эффективность добывающих модулей на 10% за уровень.',
    icon: 'Factory',
    baseCost: { energy: 200, minerals: 300 },
    costMultiplier: 2.0,
    baseProduction: {},
    productionPerLevel: {},
    maxLevel: 10,
    buildTime: 120,
    buildTimePerLevel: 40,
  },
  {
    id: 'shield_generator',
    name: 'Щитовой генератор',
    type: 'defense',
    description: 'Проекционный щит, защищающий станцию от атак. +15% защиты за уровень.',
    icon: 'Shield',
    baseCost: { energy: 250, minerals: 200, bioMatter: 50 },
    costMultiplier: 2.1,
    baseProduction: {},
    productionPerLevel: {},
    maxLevel: 10,
    buildTime: 150,
    buildTimePerLevel: 50,
  },
  {
    id: 'turret_array',
    name: 'Турельная батарея',
    type: 'defense',
    description: 'Автоматические лазерные туррели для отражения атак.',
    icon: 'Crosshair',
    baseCost: { energy: 180, minerals: 250 },
    costMultiplier: 1.9,
    baseProduction: {},
    productionPerLevel: {},
    maxLevel: 10,
    buildTime: 100,
    buildTimePerLevel: 35,
  },
  {
    id: 'laboratory',
    name: 'Научная лаборатория',
    type: 'research',
    description: 'Генерирует очки науки для исследований. +2 очка/мин за уровень.',
    icon: 'FlaskConical',
    baseCost: { energy: 300, minerals: 200, bioMatter: 100 },
    costMultiplier: 2.2,
    baseProduction: {},
    productionPerLevel: {},
    maxLevel: 10,
    buildTime: 180,
    buildTimePerLevel: 60,
  },
  {
    id: 'crystal_extractor',
    name: 'Кристаллоэкстрактор',
    type: 'mining',
    description: 'Специализированный экстрактор для добычи кристаллов из аномалий.',
    icon: 'Diamond',
    baseCost: { energy: 400, minerals: 300, crystals: 20 },
    costMultiplier: 2.5,
    baseProduction: { crystals: 0.5 },
    productionPerLevel: { crystals: 0.3 },
    maxLevel: 10,
    buildTime: 240,
    buildTimePerLevel: 80,
  },
  {
    id: 'habitat',
    name: 'Жилой отсек',
    type: 'habitat',
    description: 'Размещает экипаж. Каждый уровень позволяет нанять ещё 2 офицеров.',
    icon: 'Users',
    baseCost: { energy: 100, minerals: 150, bioMatter: 80 },
    costMultiplier: 1.6,
    baseProduction: {},
    productionPerLevel: {},
    maxLevel: 10,
    buildTime: 60,
    buildTimePerLevel: 20,
  },
  {
    id: 'hangar',
    name: 'Ангар',
    type: 'hangar',
    description: 'Строительный док для кораблей. Каждый уровень ускоряет строительство флота на 10%.',
    icon: 'Rocket',
    baseCost: { energy: 350, minerals: 400 },
    costMultiplier: 2.0,
    baseProduction: {},
    productionPerLevel: {},
    maxLevel: 10,
    buildTime: 200,
    buildTimePerLevel: 60,
  },
];

// ============================================
// Tech Tree Definitions
// ============================================
export const TECH_DEFS: TechDef[] = [
  // Military Branch
  { id: 'laser_mk2', name: 'Лазеры Mk.II', branch: 'military', description: 'Улучшенное лазерное вооружение. +20% урона всем кораблям.', cost: 50, crystalCost: 5, prerequisites: [], tier: 1, unlocks: 'Урон кораблей +20%', icon: 'Swords' },
  { id: 'hull_plating', name: 'Бронеплиты', branch: 'military', description: 'Усиленная обшивка корпусов. +25% защиты.', cost: 60, crystalCost: 8, prerequisites: ['laser_mk2'], tier: 2, unlocks: 'Защита +25%', icon: 'ShieldCheck' },
  { id: 'torpedo_sys', name: 'Торпедная система', branch: 'military', description: 'Массированные торпедные залпы. Открывает крейсеры.', cost: 120, crystalCost: 15, prerequisites: ['hull_plating'], tier: 3, unlocks: 'Крейсеры', icon: 'Bomb' },
  { id: 'dreadnought_tech', name: 'Дредноуты', branch: 'military', description: 'Сверхмощные корабли-крепости. Открывает дредноуты.', cost: 300, crystalCost: 40, prerequisites: ['torpedo_sys'], tier: 4, unlocks: 'Дредноуты', icon: 'Crown' },

  // Engineering Branch
  { id: 'adv_refinery', name: 'Продвинутая переработка', branch: 'engineering', description: 'Оптимизация переработки. +30% ко всей добыче.', cost: 40, crystalCost: 3, prerequisites: [], tier: 1, unlocks: 'Добыча +30%', icon: 'Cogs' },
  { id: 'quantum_power', name: 'Квантовый генератор', branch: 'engineering', description: 'Бесконечный источник энергии. +50% энергии.', cost: 80, crystalCost: 10, prerequisites: ['adv_refinery'], tier: 2, unlocks: 'Энергия +50%', icon: 'Atom' },
  { id: 'nano_repair', name: 'Наноремонт', branch: 'engineering', description: 'Самовосстанавливающиеся модули. Авто-ремонт после атак.', cost: 150, crystalCost: 20, prerequisites: ['quantum_power'], tier: 3, unlocks: 'Авто-ремонт', icon: 'Wrench' },
  { id: 'wormhole_tech', name: 'Технология червоточин', branch: 'engineering', description: 'Мгновенные прыжки между секторами.', cost: 350, crystalCost: 50, prerequisites: ['nano_repair'], tier: 4, unlocks: 'Быстрые перемещения', icon: 'CircleDot' },

  // Biological Branch
  { id: 'bio_farming', name: 'Гидропоника v2', branch: 'biological', description: 'Улучшенные биофермы. +40% биоматерии.', cost: 35, crystalCost: 2, prerequisites: [], tier: 1, unlocks: 'Биоматерия +40%', icon: 'Sprout' },
  { id: 'med_bay', name: 'Медотсек продвинутый', branch: 'biological', description: 'Нанотехнологии лечения. Экипаж работает эффективнее.', cost: 70, crystalCost: 8, prerequisites: ['bio_farming'], tier: 2, unlocks: 'Эффективность экипажа', icon: 'Heart' },
  { id: 'bio_weapons', name: 'Биооружие', branch: 'biological', description: 'Органические корабли-симбиоты. Открывает био-фрегаты.', cost: 140, crystalCost: 18, prerequisites: ['med_bay'], tier: 3, unlocks: 'Био-фрегаты', icon: 'Bug' },
  { id: 'terraform', name: 'Терраформирование', branch: 'biological', description: 'Изменение среды обитания. Бонусы к всем ресурсам.', cost: 320, crystalCost: 45, prerequisites: ['bio_weapons'], tier: 4, unlocks: 'Все ресурсы +20%', icon: 'Globe' },

  // Psycho-Energy Branch
  { id: 'psionic_sense', name: 'Псиочувствительность', branch: 'psycho', description: 'Усиленная интуиция. Лучшие результаты сканирования.', cost: 45, crystalCost: 5, prerequisites: [], tier: 1, unlocks: 'Сканирование +30%', icon: 'Brain' },
  { id: 'mind_link', name: 'Ментальная связь', branch: 'psycho', description: 'Связь с экипажем на расстоянии. +1 к тактике боя.', cost: 90, crystalCost: 12, prerequisites: ['psionic_sense'], tier: 2, unlocks: 'Тактика +1', icon: 'Link' },
  { id: 'energy_shield', name: 'Пси-щит', branch: 'psycho', description: 'Энергетический барьер на основе пси-энергии. Блокирует первый удар.', cost: 160, crystalCost: 22, prerequisites: ['mind_link'], tier: 3, unlocks: 'Пси-щит', icon: 'Sparkles' },
  { id: 'precognition', name: 'Предвидение', branch: 'psycho', description: 'Видение будущего. Предотвращает случайные события.', cost: 380, crystalCost: 55, prerequisites: ['energy_shield'], tier: 4, unlocks: 'Без случайных событий', icon: 'Eye' },
];

// ============================================
// Ship Definitions
// ============================================
export const SHIP_DEFS: ShipDef[] = [
  { id: 'scout', name: 'Разведчик', class: 'fighter', attack: 10, defense: 5, speed: 20, cost: { energy: 50, minerals: 80 }, buildTime: 30, description: 'Быстрый и дешёвый разведывательный корабль.', icon: 'Plane', unlockedByTech: null },
  { id: 'interceptor', name: 'Перехватчик', class: 'fighter', attack: 18, defense: 8, speed: 16, cost: { energy: 80, minerals: 120 }, buildTime: 45, description: 'Лёгкий истребитель для перехвата.', icon: 'PlaneTakeoff', unlockedByTech: null },
  { id: 'heavy_fighter', name: 'Тяжёлый истребитель', class: 'fighter', attack: 30, defense: 15, speed: 12, cost: { energy: 150, minerals: 200 }, buildTime: 60, description: 'Бронированный истребитель фронтовой линии.', icon: 'Fighter', unlockedByTech: 'laser_mk2' },
  { id: 'frigate', name: 'Фрегат', class: 'frigate', attack: 50, defense: 35, speed: 10, cost: { energy: 300, minerals: 400, bioMatter: 50 }, buildTime: 120, description: 'Универсальный боевой корабль.', icon: 'Ship', unlockedByTech: null },
  { id: 'stealth_frigate', name: 'Стелс-фрегат', class: 'frigate', attack: 40, defense: 25, speed: 14, cost: { energy: 350, minerals: 300, crystals: 10 }, buildTime: 150, description: 'Невидимый для сканеров противника.', icon: 'EyeOff', unlockedByTech: 'psionic_sense' },
  { id: 'bio_frigate', name: 'Био-фрегат', class: 'frigate', attack: 45, defense: 40, speed: 11, cost: { energy: 250, minerals: 200, bioMatter: 150, crystals: 15 }, buildTime: 140, description: 'Органический корабль с саморемонтом.', icon: 'Bug', unlockedByTech: 'bio_weapons' },
  { id: 'cruiser', name: 'Крейсер', class: 'cruiser', attack: 100, defense: 70, speed: 7, cost: { energy: 600, minerals: 800, crystals: 30 }, buildTime: 300, description: 'Мощный корабль с торпедной системой.', icon: 'Anchor', unlockedByTech: 'torpedo_sys' },
  { id: 'carrier', name: 'Автомобиль-носитель', class: 'cruiser', attack: 60, defense: 120, speed: 5, cost: { energy: 800, minerals: 1000, crystals: 50 }, buildTime: 420, description: 'Мобильная база для истребителей.', icon: 'Warehouse', unlockedByTech: 'hull_plating' },
  { id: 'dreadnought', name: 'Дредноут', class: 'dreadnought', attack: 250, defense: 200, speed: 3, cost: { energy: 2000, minerals: 3000, bioMatter: 500, crystals: 100 }, buildTime: 900, description: 'Легендарный корабль-крепость.', icon: 'Crown', unlockedByTech: 'dreadnought_tech' },
];

// ============================================
// Room Definitions
// ============================================
export const ROOM_DEFS: RoomDef[] = [
  { id: 'bridge', name: 'Мостик', description: 'Командный центр станции с голографической картой сектора.', icon: 'Compass', unlocked: true, unlockCost: null, bgColor: 'from-blue-950/80 to-cyan-950/80', accentColor: '#00f0ff', ambientDesc: 'Мерцающие голографические экраны, тихий гул навигационных систем, запах озона.' },
  { id: 'engineering', name: 'Инженерный отсек', description: 'Сердце станции — реакторы, трубопроводы и терминалы управления модулями.', icon: 'Wrench', unlocked: true, unlockCost: null, bgColor: 'from-orange-950/80 to-amber-950/80', accentColor: '#ff6b35', ambientDesc: 'Пульсирующие трубы с энергией, металлический стук механизмов, жар от реакторов.' },
  { id: 'bioLab', name: 'Биолаборатория', description: 'Гидропонические фермы и лаборатории по выращиванию биоматерии.', icon: 'FlaskConical', unlocked: true, unlockCost: null, bgColor: 'from-green-950/80 to-emerald-950/80', accentColor: '#22c55e', ambientDesc: 'Зелёные лампы, стеклянные стены со светящимися водорослями, влажный воздух.' },
  { id: 'hangar', name: 'Ангар', description: 'Космодок для строительства и обслуживания кораблей.', icon: 'Rocket', unlocked: true, unlockCost: null, bgColor: 'from-slate-950/80 to-zinc-950/80', accentColor: '#94a3b8', ambientDesc: 'Огромное пространство, подвешенные корабли, эхо шагов, запах топлива.' },
  { id: 'bar', name: 'Кают-компания', description: 'Социальный хаб с баром, NPC-квестами и мини-играми.', icon: 'Wine', unlocked: false, unlockCost: { energy: 500, minerals: 300, bioMatter: 100 }, bgColor: 'from-purple-950/80 to-fuchsia-950/80', accentColor: '#a855f7', ambientDesc: 'Неоновые вывески, тихая музыка, запах кофе и чего-то сладкого.' },
  { id: 'serverRoom', name: 'Серверная', description: 'Лаборатория с терминалами для взлома и исследований технологий.', icon: 'Server', unlocked: false, unlockCost: { energy: 800, minerals: 600, crystals: 30 }, bgColor: 'from-violet-950/80 to-indigo-950/80', accentColor: '#8b5cf6', ambientDesc: 'Тёмные комнаты, бесконечные стойки серверов, голографические экраны с кодом.' },
  { id: 'corridor', name: 'Аварийный коридор', description: 'Секретный проход с легендарными артефактами предшественников.', icon: 'AlertTriangle', unlocked: false, unlockCost: null, bgColor: 'from-red-950/80 to-rose-950/80', accentColor: '#ef4444', ambientDesc: 'Красные мигающие лампы, сорванные кабели, тревожный гул.' },
];

// ============================================
// Shop Items
// ============================================
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'boost_1h', name: 'Ускоритель 1ч', description: 'Ускоряет строительство или исследование на 1 час.', cost: 5, category: 'boost', icon: 'Clock', effect: 'speed_up_1h' },
  { id: 'boost_6h', name: 'Ускоритель 6ч', description: 'Ускоряет строительство или исследование на 6 часов.', cost: 25, category: 'boost', icon: 'Clock', effect: 'speed_up_6h' },
  { id: 'boost_12h', name: 'Ускоритель 12ч', description: 'Ускоряет строительство или исследование на 12 часов.', cost: 50, category: 'boost', icon: 'Clock', effect: 'speed_up_12h' },
  { id: 'mining_boost', name: 'Буст добычи', description: '+30% ко всей добыче на 2 часа.', cost: 15, category: 'boost', icon: 'TrendingUp', effect: 'mining_boost_2h' },
  { id: 'research_boost', name: 'Буст науки', description: '+50% к очкам науки на 2 часа.', cost: 20, category: 'boost', icon: 'FlaskConical', effect: 'research_boost_2h' },
  { id: 'slot_7', name: 'Слот модуля #7', description: 'Открывает 7-й слот для модуля на станции.', cost: 100, category: 'slot', icon: 'PlusSquare', effect: 'extra_slot' },
  { id: 'slot_8', name: 'Слот модуля #8', description: 'Открывает 8-й слот для модуля на станции.', cost: 200, category: 'slot', icon: 'PlusSquare', effect: 'extra_slot' },
  { id: 'skin_phoenix', name: 'Тёмный Феникс', description: 'Скин станции: огненные акценты и следы пламени.', cost: 150, category: 'cosmetic', icon: 'Flame', effect: 'skin_phoenix' },
  { id: 'skin_ghost', name: 'Ледяной Призрак', description: 'Скин станции: лёд и мороз, звуки хруста.', cost: 150, category: 'cosmetic', icon: 'Snowflake', effect: 'skin_ghost' },
  { id: 'skin_nebula', name: 'Туманность', description: 'Скин станции: переливающиеся цвета туманности.', cost: 200, category: 'cosmetic', icon: 'Sparkles', effect: 'skin_nebula' },
  { id: 'expedition_1', name: 'Экспедиционный билет', description: 'Доступ к PvE-рейду с повышенной наградой.', cost: 10, category: 'expedition', icon: 'Map', effect: 'expedition' },
  { id: 'expedition_5', name: 'Пакет экспедиций x5', description: '5 билетов на экспедиции со скидкой.', cost: 40, category: 'expedition', icon: 'Map', effect: 'expedition_5' },
  { id: 'premium_7', name: 'Премиум 7 дней', description: 'Ежедневный бонус, эксклюзивные задания, скидка 20%.', cost: 80, category: 'subscription', icon: 'Star', effect: 'premium_7d' },
  { id: 'premium_30', name: 'Премиум 30 дней', description: 'Ежедневный бонус, эксклюзивные задания, скидка 20%.', cost: 250, category: 'subscription', icon: 'Star', effect: 'premium_30d' },
  { id: 'pack_minerals', name: 'Пакет минералов', description: '5000 минералов для быстрого строительства.', cost: 20, category: 'boost', icon: 'Package', effect: 'pack_minerals' },
  { id: 'pack_energy', name: 'Пакет энергии', description: '5000 энергии для питания модулей.', cost: 20, category: 'boost', icon: 'Package', effect: 'pack_energy' },
];

// ============================================
// Map Nodes (Andromeda-7 Sector)
// ============================================
export const DEFAULT_MAP_NODES: MapNode[] = [
  { id: 'home', name: 'Ваша станция', type: 'station', x: 50, y: 50, owner: 'player', level: 1, resources: {}, danger: 0, discovered: true },
  { id: 'asteroid_1', name: 'Астероидное поле Альфа', type: 'pirate', x: 30, y: 35, owner: null, level: 1, resources: { minerals: 500 }, danger: 2, discovered: true },
  { id: 'anomaly_1', name: 'Кристаллическая аномалия', type: 'anomaly', x: 70, y: 25, owner: null, level: 2, resources: { crystals: 50 }, danger: 3, discovered: true },
  { id: 'station_1', name: 'Торговый пост "Нексус"', type: 'neutral', x: 65, y: 60, owner: null, level: 3, resources: {}, danger: 1, discovered: false },
  { id: 'pirate_1', name: 'База пиратов "Красная Яма"', type: 'pirate', x: 20, y: 70, owner: 'pirates', level: 4, resources: { energy: 1000, minerals: 800 }, danger: 6, discovered: false },
  { id: 'anomaly_2', name: 'Туманность Призрака', type: 'anomaly', x: 80, y: 45, owner: null, level: 3, resources: { crystals: 80 }, danger: 5, discovered: false },
  { id: 'empty_1', name: 'Пустой сектор Г-12', type: 'empty', x: 40, y: 20, owner: null, level: 0, resources: {}, danger: 0, discovered: false },
  { id: 'pirate_2', name: 'Флот налетчиков', type: 'pirate', x: 15, y: 45, owner: 'pirates', level: 2, resources: { minerals: 600, bioMatter: 200 }, danger: 4, discovered: false },
  { id: 'station_2', name: 'Исследовательская станция Омега', type: 'neutral', x: 85, y: 75, owner: null, level: 5, resources: {}, danger: 2, discovered: false },
  { id: 'anomaly_3', name: 'Черная дыра "Жало"', type: 'anomaly', x: 45, y: 80, owner: null, level: 6, resources: { crystals: 200 }, danger: 9, discovered: false },
  { id: 'pirate_3', name: 'Крепость "Железный Клык"', type: 'pirate', x: 75, y: 85, owner: 'pirates', level: 7, resources: { energy: 2000, minerals: 1500, crystals: 50 }, danger: 8, discovered: false },
  { id: 'empty_2', name: 'Сектор релаксации', type: 'empty', x: 55, y: 15, owner: null, level: 0, resources: {}, danger: 0, discovered: false },
  { id: 'station_3', name: 'Черный рынок "Тень"', type: 'neutral', x: 10, y: 20, owner: null, level: 4, resources: {}, danger: 3, discovered: false },
  { id: 'pirate_4', name: 'Рейдеры Крайнего Пояса', type: 'pirate', x: 90, y: 15, owner: 'pirates', level: 3, resources: { minerals: 400, energy: 300 }, danger: 3, discovered: false },
  { id: 'anomaly_4', name: 'Нейтринный источник', type: 'anomaly', x: 35, y: 90, owner: null, level: 4, resources: { crystals: 120, energy: 500 }, danger: 6, discovered: false },
  { id: 'empty_3', name: 'Сектор дебризов Дельта', type: 'empty', x: 8, y: 55, owner: null, level: 0, resources: { minerals: 200 }, danger: 1, discovered: false },
  { id: 'pirate_5', name: 'Синдикат "Глубина"', type: 'pirate', x: 92, y: 55, owner: 'pirates', level: 5, resources: { minerals: 1000, crystals: 30 }, danger: 5, discovered: false },
  { id: 'anomaly_5', name: 'Тёмная материя Сигма', type: 'anomaly', x: 60, y: 92, owner: null, level: 5, resources: { crystals: 150, bioMatter: 300 }, danger: 7, discovered: false },
  { id: 'station_4', name: 'Автодок "Восстановление"', type: 'neutral', x: 25, y: 10, owner: null, level: 2, resources: {}, danger: 1, discovered: false },
  { id: 'pirate_6', name: 'Охотники за скарбом', type: 'pirate', x: 5, y: 85, owner: 'pirates', level: 6, resources: { energy: 1500, minerals: 2000, bioMatter: 500 }, danger: 7, discovered: false },
  { id: 'empty_4', name: 'Заброшенная колония', type: 'empty', x: 50, y: 5, owner: null, level: 0, resources: { energy: 100, minerals: 100 }, danger: 0, discovered: false },
  { id: 'anomaly_6', name: 'Квазар "Пробуждение"', type: 'anomaly', x: 88, y: 30, owner: null, level: 7, resources: { crystals: 300, energy: 1000 }, danger: 10, discovered: false },
  { id: 'station_5', name: 'Пиратский бар "Ржавый Якорь"', type: 'neutral', x: 42, y: 55, owner: null, level: 3, resources: {}, danger: 2, discovered: false },
];

// ============================================
// Default Daily Quests
// ============================================
export function generateDailyQuests(): DailyQuest[] {
  const quests: DailyQuest[] = [
    { id: 'mine_minerals', description: 'Добудьте 1000 минералов', target: 1000, progress: 0, reward: { shards: 5, resources: { energy: 200 } }, completed: false, claimed: false },
    { id: 'win_pvp', description: 'Одержите 3 победы в PvP', target: 3, progress: 0, reward: { shards: 8, resources: { crystals: 10 } }, completed: false, claimed: false },
    { id: 'scan_sector', description: 'Выполните 2 сканирования', target: 2, progress: 0, reward: { shards: 3 }, completed: false, claimed: false },
    { id: 'upgrade_module', description: 'Улучшите модуль до уровня 5', target: 5, progress: 0, reward: { shards: 6, resources: { minerals: 500 } }, completed: false, claimed: false },
  ];
  return quests;
}

// ============================================
// Achievements
// ============================================
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_build', name: 'Первый кирпич', description: 'Постройте первый модуль', icon: 'Hammer', unlocked: false, unlockedAt: null },
  { id: 'miner_1k', name: 'Шахтёр', description: 'Накопите 1,000,000 минералов всего', icon: 'Pickaxe', unlocked: false, unlockedAt: null },
  { id: 'warrior_100', name: 'Ветеран', description: 'Победите 100 врагов', icon: 'Swords', unlocked: false, unlockedAt: null },
  { id: 'researcher', name: 'Учёный', description: 'Исследуйте 10 технологий', icon: 'FlaskConical', unlocked: false, unlockedAt: null },
  { id: 'collector', name: 'Коллекционер', description: 'Соберите 5 артефактов предшественников', icon: 'Gem', unlocked: false, unlockedAt: null },
  { id: 'commander', name: 'Командир', description: 'Достигните 10 уровня станции', icon: 'Star', unlocked: false, unlockedAt: null },
  { id: 'scavenger', name: 'Мусорщик', description: 'Найдите 10 тайников на станции', icon: 'Search', unlocked: false, unlockedAt: null },
  { id: 'pvp_master', name: 'Доминатор', description: 'Достигните рейтинга 2000', icon: 'Trophy', unlocked: false, unlockedAt: null },
];

// ============================================
// Resource Display Config
// ============================================
export const RESOURCE_CONFIG = {
  energy: { name: 'Энергия', icon: 'Zap', color: '#fbbf24', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/40' },
  minerals: { name: 'Минералы', icon: 'Pickaxe', color: '#06b6d4', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/40' },
  bioMatter: { name: 'Биоматерия', icon: 'Leaf', color: '#22c55e', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/40' },
  crystals: { name: 'Кристаллы', icon: 'Diamond', color: '#a855f7', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/40' },
} as const;

export const FACTION_CONFIG = {
  traders: { name: 'Торговцы', icon: 'Store', color: '#fbbf24', description: 'Бонусы к торговле и ресурсам' },
  military: { name: 'Военные', icon: 'Shield', color: '#ef4444', description: 'Бонусы к бою и защите' },
  scientists: { name: 'Учёные', icon: 'Microscope', color: '#a855f7', description: 'Бонусы к исследованиям' },
} as const;

export const COMBAT_TACTIC_CONFIG = {
  aggressive: { name: 'Агрессивная', description: 'Урон +20%, Защита -10%', icon: 'Swords', attackMod: 1.2, defenseMod: 0.9 },
  defensive: { name: 'Оборонительная', description: 'Защита +20%, Урон -10%', icon: 'Shield', attackMod: 0.9, defenseMod: 1.2 },
  recon: { name: 'Разведывательная', description: 'Информация о противнике +50%', icon: 'Eye', attackMod: 1.0, defenseMod: 1.0 },
} as const;

export const SHIP_CLASS_NAMES: Record<string, string> = {
  fighter: 'Истребитель',
  frigate: 'Фрегат',
  cruiser: 'Крейсер',
  dreadnought: 'Дредноут',
};

export const MODULE_TYPE_NAMES: Record<string, string> = {
  mining: 'Добыча',
  processing: 'Переработка',
  defense: 'Оборона',
  research: 'Исследования',
  habitat: 'Жилые',
  hangar: 'Ангар',
};

export const COLLECTION_COOLDOWN = 5 * 60 * 1000; // 5 minutes
export const SCAN_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours
export const ASTEROID_EVENT_INTERVAL = 30 * 60 * 1000; // 30 minutes (for demo, shortened)