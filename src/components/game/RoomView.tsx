'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { ROOM_DEFS, MODULE_DEFS, SHIP_DEFS, TECH_DEFS, RESOURCE_CONFIG, MODULE_TYPE_NAMES, SHIP_CLASS_NAMES, COLLECTION_COOLDOWN } from '@/lib/game/constants';
import type { RoomId } from '@/lib/game/types';
import {
  Compass, Wrench, FlaskConical, Rocket, Wine, Server, AlertTriangle,
  Zap, Pickaxe, Leaf, Diamond, Shield, Crosshair, Factory, Users,
  Eye, Map, Swords, Brain, Heart, Bug, Globe, Cog, Atom, Anchor,
  Crown, Plane, PlaneTakeoff, Ship as ShipIcon, Warehouse,
  EyeOff, Star, Clock, TrendingUp, ChevronRight, CircleDot, Sparkles,
  Link, ShieldCheck, Bomb, Package, Music,
  MessageCircle, Lock, Play, RotateCw, ArrowRight, Scan, Terminal,
  Activity, Radio, Cpu, Database, HardDrive, Flame, Snowflake,
  Search, Skull, Ghost, ScrollText, Trophy
} from 'lucide-react';

// ============================================================
// Utility: Dynamic Lucide icon resolver
// ============================================================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Zap, Pickaxe, Leaf, Diamond, Shield, Crosshair, Factory, Users, FlaskConical, Rocket,
  Swords, Brain, Heart, Bug, Globe, Cog, Atom, Anchor, Crown, Plane, PlaneTakeoff, ShipIcon,
  Warehouse, EyeOff, Eye, Link, ShieldCheck, Bomb,
  CircleDot, Sparkles, Compass, Wrench, Wine, Server, AlertTriangle, Terminal,
  Star, Clock, TrendingUp, Package, Activity, Radio, Cpu, Database, HardDrive,
  Flame, Snowflake, Search, Skull, Ghost, ScrollText, Trophy, Play, RotateCw,
  ArrowRight, Scan, MessageCircle, Lock, Music, ChevronRight, Map,
};

function getIcon(name: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return ICON_MAP[name] || Zap;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}м ${sec}с` : `${sec}с`;
}

// ============================================================
// Animation Variants
// ============================================================
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, x: -15 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, type: 'spring', bounce: 0.25 } },
};

// ============================================================
// Room Header Icons (pre-built to avoid dynamic component creation)
// ============================================================
const ROOM_HEADER_ICONS: Record<string, React.ReactNode> = {};
(() => {
  for (const room of ROOM_DEFS) {
    const Icon = getIcon(room.icon);
    ROOM_HEADER_ICONS[room.id] = <Icon className="w-6 h-6" style={{ color: room.accentColor }} />;
  }
})();

function RoomHeaderIcon({ roomId }: { roomId: string }) {
  return <>{ROOM_HEADER_ICONS[roomId]}</>;
}

// ============================================================
// Main Component
// ============================================================
export default function RoomView() {
  const currentRoom = useGameStore(s => s.currentRoom);

  if (!currentRoom) return null;

  const roomDef = ROOM_DEFS.find(r => r.id === currentRoom);
  if (!roomDef) return null;

  return (
    <div className={`holo-transition min-h-full ${roomDef.bgColor} relative overflow-hidden`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRoom}
          className="p-4 pb-24 relative z-10"
          {...fadeIn}
        >
          {/* Room Header */}
          <motion.div className="mb-4" {...scaleIn}>
            <div className="flex items-center gap-3 mb-1">
              <RoomHeaderIcon roomId={currentRoom} />
              <h2 className="text-xl font-bold tracking-wide" style={{ color: roomDef.accentColor }}>
                {roomDef.name}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground italic leading-relaxed ml-9">
              {roomDef.ambientDesc}
            </p>
          </motion.div>

          {/* Room Content */}
          {currentRoom === 'bridge' && <BridgeRoom accentColor={roomDef.accentColor} />}
          {currentRoom === 'engineering' && <EngineeringRoom accentColor={roomDef.accentColor} />}
          {currentRoom === 'bioLab' && <BioLabRoom accentColor={roomDef.accentColor} />}
          {currentRoom === 'hangar' && <HangarRoom accentColor={roomDef.accentColor} />}
          {currentRoom === 'bar' && <BarRoom accentColor={roomDef.accentColor} />}
          {currentRoom === 'serverRoom' && <ServerRoom accentColor={roomDef.accentColor} />}
          {currentRoom === 'corridor' && <CorridorRoom accentColor={roomDef.accentColor} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// 1. BRIDGE ROOM
// ============================================================
function BridgeRoom({ accentColor }: { accentColor: string }) {
  const modules = useGameStore(s => s.modules);
  const ships = useGameStore(s => s.ships);
  const resources = useGameStore(s => s.resources);
  const setScreen = useGameStore(s => s.setScreen);
  const stationName = useGameStore(s => s.stationName);
  const stationLevel = useGameStore(s => s.stationLevel);

  const totalFleetPower = useMemo(() => {
    return ships.reduce((sum, s) => {
      const def = SHIP_DEFS.find(d => d.id === s.defId);
      if (!def) return sum;
      return sum + (def.attack + def.defense) * s.quantity;
    }, 0);
  }, [ships]);

  const healthyModules = modules.filter(m => !m.building).length;
  const buildingModules = modules.filter(m => m.building).length;

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Holographic Map Display */}
      <motion.div variants={staggerItem} className="relative">
        <div
          className="relative rounded-2xl overflow-hidden p-4"
          style={{
            border: `1px solid ${accentColor}33`,
            boxShadow: `0 0 30px ${accentColor}15, inset 0 0 30px ${accentColor}08`,
            background: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,240,255,0.03))`,
          }}
        >
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(${accentColor}22 1px, transparent 1px), linear-gradient(90deg, ${accentColor}22 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
            }}
          />
          {/* Pulsing scan ring */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, transparent 30%, ${accentColor}08 70%, transparent 71%)`,
              animation: 'glow-pulse 3s ease-in-out infinite',
            }}
          />
          <div className="relative z-10 text-center py-6">
            <div className="text-[10px] font-mono tracking-[0.3em] mb-2 opacity-50" style={{ color: accentColor }}>
              ГОЛОГРАФИЧЕСКАЯ КАРТА СЕКТОРА
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: accentColor }}>
              Андромеда-7
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Уровень угрозы: <span className="text-yellow-400">СРЕДНИЙ</span>
            </div>
            {/* Fake star dots */}
            <div className="flex justify-center gap-3 mt-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: accentColor,
                    animation: `ambient-blink ${2 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status Panels */}
      <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2">
        {/* Station Status */}
        <div
          className="rounded-xl p-3 text-center"
          style={{
            border: `1px solid ${accentColor}22`,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div className="text-[9px] font-mono opacity-50 mb-1" style={{ color: accentColor }}>СТАНЦИЯ</div>
          <div className="text-lg font-bold" style={{ color: accentColor }}>{stationName}</div>
          <div className="text-[10px] text-muted-foreground">Ур. {stationLevel}</div>
          <div className="text-[10px] text-green-400 mt-0.5">{healthyModules} / {modules.length} мод.</div>
        </div>
        {/* Fleet Status */}
        <div
          className="rounded-xl p-3 text-center"
          style={{
            border: `1px solid ${accentColor}22`,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div className="text-[9px] font-mono opacity-50 mb-1" style={{ color: accentColor }}>ФЛОТ</div>
          <div className="text-lg font-bold" style={{ color: accentColor }}>
            {ships.reduce((s, sh) => s + sh.quantity, 0)}
          </div>
          <div className="text-[10px] text-muted-foreground">кораблей</div>
          <div className="text-[10px] text-orange-400 mt-0.5">⚡ {formatNumber(totalFleetPower)}</div>
        </div>
        {/* Resource Summary */}
        <div
          className="rounded-xl p-3 text-center"
          style={{
            border: `1px solid ${accentColor}22`,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div className="text-[9px] font-mono opacity-50 mb-1" style={{ color: accentColor }}>РЕСУРСЫ</div>
          <div className="text-sm font-bold" style={{ color: '#fbbf24' }}>⚡ {formatNumber(resources.energy)}</div>
          <div className="text-[10px]" style={{ color: '#06b6d4' }}>⛏ {formatNumber(resources.minerals)}</div>
          <div className="text-[10px]" style={{ color: '#a855f7' }}>◆ {resources.crystals}</div>
        </div>
      </motion.div>

      {/* Console Indicators */}
      <motion.div variants={staggerItem} className="flex justify-center gap-6 py-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-2">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: accentColor,
                boxShadow: `0 0 10px ${accentColor}, 0 0 20px ${accentColor}66`,
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
            />
            <span className="text-[9px] font-mono text-muted-foreground">
              {['НАВ', 'ЩИТ', 'ЭНЕР'][i]}
            </span>
          </div>
        ))}
      </motion.div>

      {/* NPC Dialogue Bubble */}
      <motion.div variants={staggerItem}>
        <div
          className="rounded-2xl rounded-tl-sm p-3 relative"
          style={{
            border: `1px solid ${accentColor}22`,
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div className="absolute -top-2 -left-1 w-4 h-4 rotate-45" style={{ background: 'rgba(0,0,0,0.4)', borderLeft: `1px solid ${accentColor}22`, borderBottom: `1px solid ${accentColor}22` }} />
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}44` }}>
              <Radio className="w-4 h-4" style={{ color: accentColor }} />
            </div>
            <div>
              <div className="text-[10px] font-mono mb-1" style={{ color: accentColor }}>ОФИЦЕР СВЯЗИ</div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Капитан, обнаружена новая аномалия в секторе G-12. Рекомендую сканирование.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={staggerItem} className="flex gap-2">
        {[
          { label: 'Разведка', icon: Eye, screen: 'map' as const },
          { label: 'Флот', icon: Rocket, screen: 'fleet' as const },
          { label: 'Карта', icon: Map, screen: 'map' as const },
        ].map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => setScreen(action.screen)}
              className="holo-btn flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                border: `1px solid ${accentColor}33`,
                background: `${accentColor}0d`,
                color: accentColor,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 2. ENGINEERING ROOM
// ============================================================
function EngineeringRoom({ accentColor }: { accentColor: string }) {
  const modules = useGameStore(s => s.modules);
  const resources = useGameStore(s => s.resources);
  const upgradeModule = useGameStore(s => s.upgradeModule);
  const buildModule = useGameStore(s => s.buildModule);
  const setNotification = useGameStore(s => s.setNotification);
  const getBuildTimeRemaining = useGameStore(s => s.getBuildTimeRemaining);
  const moduleSlots = useGameStore(s => s.moduleSlots);

  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const times: Record<string, number> = {};
      modules.forEach(m => {
        if (m.building) times[m.id] = getBuildTimeRemaining(m.id);
      });
      setTimeLeft(times);
    }, 1000);
    return () => clearInterval(interval);
  }, [modules, getBuildTimeRemaining]);

  const hasBuildingModule = modules.some(m => m.building);

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Pipes Visual */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: `${accentColor}15` }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)`, width: '40%' }}
          animate={{ x: ['-100%', '350%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Module Count / Build Button */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">
          Модули: {modules.length}/{moduleSlots}
        </span>
        {modules.length < moduleSlots && (
          <button
            onClick={() => setBuildMenuOpen(!buildMenuOpen)}
            className="holo-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: `1px solid ${accentColor}44`, background: `${accentColor}15`, color: accentColor }}
          >
            <Plus className="w-3.5 h-3.5" />
            Построить
          </button>
        )}
      </motion.div>

      {/* Quick Build Menu */}
      <AnimatePresence>
        {buildMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${accentColor}22` }}>
              {Object.entries(MODULE_TYPE_NAMES).map(([type, name]) => {
                const count = modules.filter(m => {
                  const def = MODULE_DEFS.find(d => d.id === m.defId);
                  return def?.type === type;
                }).length;
                const defsForType = MODULE_DEFS.filter(d => d.type === type);
                const Icon = getIcon(defsForType[0]?.icon || 'Cog');
                return (
                  <button
                    key={type}
                    onClick={() => {
                      const result = buildModule(defsForType[0].id);
                      setNotification(result.message);
                      if (result.success) setBuildMenuOpen(false);
                    }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all hover:scale-105"
                    style={{ border: `1px solid ${accentColor}15`, background: `${accentColor}08` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: accentColor }} />
                    <span className="text-[9px] text-muted-foreground">{name}</span>
                    {count > 0 && <span className="text-[8px] font-mono" style={{ color: accentColor }}>×{count}</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Construction Robot */}
      {hasBuildingModule && (
        <motion.div
          className="flex justify-center py-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="flex flex-col items-center gap-1"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Cpu className="w-8 h-8" style={{ color: accentColor }} />
            <div className="text-[9px] font-mono animate-pulse" style={{ color: accentColor }}>
              ⚙ СТРОИТЕЛЬСТВО...
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Module Terminal Cards */}
      <motion.div variants={staggerItem} className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Factory className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Нет модулей. Постройте первый!
          </div>
        )}
        {modules.map(mod => {
          const def = MODULE_DEFS.find(d => d.id === mod.defId);
          if (!def) return null;
          const Icon = getIcon(def.icon);
          const remaining = timeLeft[mod.id] || 0;
          const totalBuildTime = mod.buildEndTime && mod.buildStartTime
            ? mod.buildEndTime - mod.buildStartTime
            : 0;
          const progress = totalBuildTime > 0 ? 1 - remaining / totalBuildTime : 0;

          return (
            <motion.div
              key={mod.id}
              className="rounded-xl p-3"
              style={{
                border: `1px solid ${accentColor}22`,
                background: 'rgba(0,0,0,0.35)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}18` }}>
                    <Icon className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{def.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {MODULE_TYPE_NAMES[def.type]} • {def.description.slice(0, 35)}...
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold font-mono" style={{ color: accentColor }}>
                    Ур. {mod.level}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    ❤ {mod.health}/{mod.maxHealth}
                  </div>
                </div>
              </div>

              {/* Level Bar */}
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: Math.min(def.maxLevel, 10) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{
                      background: i < mod.level ? accentColor : 'rgba(255,255,255,0.06)',
                      boxShadow: i < mod.level ? `0 0 4px ${accentColor}66` : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Building Progress or Upgrade Button */}
              {mod.building ? (
                <div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: `${accentColor}15` }}>
                    <motion.div
                      className="h-full rounded-full build-shimmer"
                      style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%`, background: accentColor }}
                      initial={false}
                      animate={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-center mt-1" style={{ color: accentColor }}>
                    ⏳ {formatTime(remaining)}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const result = upgradeModule(mod.id);
                    setNotification(result.message);
                  }}
                  className="holo-btn w-full py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    border: `1px solid ${accentColor}33`,
                    background: `${accentColor}0d`,
                    color: accentColor,
                  }}
                >
                  Улучшить → Ур. {mod.level + 1}
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom Pipe */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: `${accentColor}15` }}>
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full"
          style={{ background: `linear-gradient(270deg, transparent, ${accentColor}88, transparent)`, width: '40%' }}
          animate={{ x: ['100%', '-350%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

// ============================================================
// 3. BIO LAB ROOM
// ============================================================
function BioLabRoom({ accentColor }: { accentColor: string }) {
  const modules = useGameStore(s => s.modules);
  const resources = useGameStore(s => s.resources);
  const collectResource = useGameStore(s => s.collectResource);
  const setNotification = useGameStore(s => s.setNotification);
  const lastCollectionTimes = useGameStore(s => s.lastCollectionTimes);
  const resourceRates = useGameStore(s => s.resourceRates);

  const bioModule = modules.find(m => m.defId === 'bio_reactor');
  const [harvesting, setHarvesting] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const particleId = useRef(0);

  useEffect(() => {
    if (!bioModule) return;
    const last = lastCollectionTimes[bioModule.id] || 0;
    const check = () => {
      const elapsed = Date.now() - last;
      setCooldownLeft(Math.max(0, COLLECTION_COOLDOWN - elapsed));
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [bioModule, lastCollectionTimes]);

  const handleHarvest = useCallback(() => {
    if (!bioModule || bioModule.building) return;
    if (cooldownLeft > 0) {
      setNotification(`Ожидание: ${formatTime(cooldownLeft)}`);
      return;
    }
    setHarvesting(true);
    // Spawn particles
    const newParticles = Array.from({ length: 12 }).map(() => ({
      id: particleId.current++,
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 120,
    }));
    setParticles(newParticles);

    setTimeout(() => {
      const result = collectResource(bioModule.id);
      setNotification(result.message);
      setParticles([]);
      setHarvesting(false);
    }, 800);
  }, [bioModule, cooldownLeft, collectResource, setNotification]);

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Bio-matter Stats */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.35)' }}>
          <div className="text-[9px] font-mono opacity-50 mb-1" style={{ color: accentColor }}>БИОМАТЕРИЯ</div>
          <div className="text-lg font-bold" style={{ color: accentColor }}>{formatNumber(resources.bioMatter)}</div>
          <div className="text-[10px] text-green-400/70">+{resourceRates.bioMatter.toFixed(1)}/мин</div>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.35)' }}>
          <div className="text-[9px] font-mono opacity-50 mb-1" style={{ color: accentColor }}>БИОРЕАКТОР</div>
          <div className="text-lg font-bold" style={{ color: accentColor }}>
            {bioModule ? `Ур. ${bioModule.level}` : '—'}
          </div>
          <div className="text-[10px] text-muted-foreground">{bioModule ? 'Активен' : 'Не построен'}</div>
        </div>
      </motion.div>

      {/* Reservoir / Harvest Area */}
      <motion.div variants={staggerItem} className="flex flex-col items-center py-4">
        <div className="relative">
          {/* Outer glow ring */}
          <motion.div
            className="absolute -inset-4 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
              border: `1px solid ${accentColor}15`,
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* Main reservoir */}
          <button
            onClick={handleHarvest}
            disabled={!bioModule || bioModule.building || cooldownLeft > 0 || harvesting}
            className="relative w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: bioModule
                ? `radial-gradient(circle at 40% 40%, ${accentColor}44, ${accentColor}11 60%, rgba(0,0,0,0.3))`
                : 'radial-gradient(circle, rgba(30,30,30,0.8), rgba(0,0,0,0.5))',
              border: `2px solid ${bioModule ? accentColor + '55' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: bioModule ? `0 0 40px ${accentColor}22, inset 0 0 30px ${accentColor}11` : 'none',
            }}
          >
            {/* Animated liquid surface */}
            {bioModule && !bioModule.building && (
              <motion.div
                className="absolute inset-2 rounded-full overflow-hidden"
                style={{ background: `${accentColor}15` }}
              >
                <motion.div
                  className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
                  style={{
                    background: `radial-gradient(ellipse at 30% 50%, ${accentColor}33, transparent 60%)`,
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            )}
            <Leaf className="w-8 h-8 mb-1 relative z-10" style={{ color: bioModule ? accentColor : 'rgba(255,255,255,0.15)' }} />
            {bioModule ? (
              <>
                <span className="text-[10px] font-mono relative z-10" style={{ color: accentColor }}>
                  {cooldownLeft > 0 ? `⏳ ${formatTime(cooldownLeft)}` : 'СОБРАТЬ'}
                </span>
                <span className="text-[8px] text-muted-foreground relative z-10">Нажмите</span>
              </>
            ) : (
              <span className="text-[9px] text-muted-foreground/50 relative z-10">Нет реактора</span>
            )}
          </button>

          {/* Harvest Particles */}
          <AnimatePresence>
            {particles.map(p => (
              <motion.div
                key={p.id}
                className="absolute w-2 h-2 rounded-full pointer-events-none"
                style={{ background: accentColor, left: '50%', top: '50%' }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Tip */}
      <motion.div variants={staggerItem} className="text-center">
        <p className="text-[10px] text-muted-foreground italic">
          💡 Собирайте урожай каждые 5 минут для максимального бонуса
        </p>
      </motion.div>

      {/* Hydroponic Farm Visual */}
      <motion.div variants={staggerItem}>
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          ГИДРОПОННАЯ ФЕРМА
        </div>
        <div className="rounded-xl p-3 overflow-hidden" style={{ border: `1px solid ${accentColor}15`, background: 'rgba(0,0,0,0.3)' }}>
          <div className="grid grid-cols-6 gap-x-3 gap-y-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full mx-auto"
                style={{
                  background: accentColor,
                  opacity: 0.3 + Math.random() * 0.5,
                  boxShadow: `0 0 4px ${accentColor}44`,
                }}
                animate={{
                  opacity: [0.2, 0.6 + Math.random() * 0.4, 0.2],
                  scale: [0.9, 1.1, 0.9],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Lab Equipment: Test Tubes */}
      <motion.div variants={staggerItem} className="flex justify-center gap-4 py-2">
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            animate={{ y: [0, -5 + i * 2, 0] }}
            transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          >
            <div
              className="w-4 rounded-t-full"
              style={{ height: `${20 + i * 8}px`, background: `linear-gradient(to top, ${accentColor}66, ${accentColor}22)`, border: `1px solid ${accentColor}33` }}
            />
            <div
              className="w-6 h-1.5 rounded-b-sm"
              style={{ background: `${accentColor}44`, border: `1px solid ${accentColor}33`, borderTop: 'none' }}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 4. HANGAR ROOM
// ============================================================
function HangarRoom({ accentColor }: { accentColor: string }) {
  const ships = useGameStore(s => s.ships);
  const resources = useGameStore(s => s.resources);
  const researchedTechs = useGameStore(s => s.researchedTechs);
  const buildShip = useGameStore(s => s.buildShip);
  const setNotification = useGameStore(s => s.setNotification);
  const modules = useGameStore(s => s.modules);
  const moduleSlots = useGameStore(s => s.moduleSlots);
  const stationLevel = useGameStore(s => s.stationLevel);

  const hangarModule = modules.find(m => m.defId === 'hangar');
  const hangarLevel = hangarModule?.level || 0;
  const maxShips = 20 + hangarLevel * 5;
  const totalShips = ships.reduce((s, sh) => s + sh.quantity, 0);

  const availableShips = useMemo(() => {
    return SHIP_DEFS.filter(def =>
      !def.unlockedByTech || researchedTechs.includes(def.unlockedByTech)
    );
  }, [researchedTechs]);

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Hangar Capacity */}
      <motion.div variants={staggerItem} className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span style={{ color: accentColor }}>АНГАР</span>
            <span className="text-muted-foreground">{totalShips}/{maxShips} кораблей</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: `${accentColor}15` }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (totalShips / maxShips) * 100)}%`,
                background: totalShips / maxShips > 0.8 ? '#ef4444' : accentColor,
              }}
              initial={false}
            />
          </div>
        </div>
      </motion.div>

      {/* Launch Pad Visual */}
      <motion.div variants={staggerItem} className="relative h-16 rounded-xl overflow-hidden" style={{ border: `1px solid ${accentColor}15`, background: 'rgba(0,0,0,0.2)' }}>
        {/* Striped floor pattern */}
        <div className="absolute inset-0 flex gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                background: i % 2 === 0 ? `${accentColor}08` : 'transparent',
                height: '100%',
              }}
            />
          ))}
        </div>
        {/* Perspective lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="text-[9px] font-mono tracking-[0.5em] opacity-30"
            style={{ color: accentColor }}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ◄ СТАРТОВАЯ ПЛОЩАДКА ►
          </motion.div>
        </div>
      </motion.div>

      {/* Owned Ships Grid */}
      <motion.div variants={staggerItem}>
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          МОИ КОРАБЛИ
        </div>
        {ships.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Rocket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Ангар пуст. Постройте первый корабль!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[35vh] overflow-y-auto pr-1">
            {ships.map(ship => {
              const def = SHIP_DEFS.find(d => d.id === ship.defId);
              if (!def) return null;
              const Icon = getIcon(def.icon);
              return (
                <motion.div
                  key={ship.id}
                  className="rounded-xl p-3"
                  style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.35)' }}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Ship silhouette */}
                  <div className="flex items-center justify-center py-2 mb-2 relative">
                    <div
                      className="absolute w-16 h-8 rounded-full opacity-10"
                      style={{ background: `radial-gradient(ellipse, ${accentColor}, transparent)` }}
                    />
                    <Icon className="w-10 h-10 relative z-10" style={{ color: accentColor, opacity: 0.8 }} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium truncate">{ship.name}</div>
                    <div className="text-[10px] text-muted-foreground">{SHIP_CLASS_NAMES[def.class]}</div>
                    <div className="text-sm font-bold font-mono mt-0.5" style={{ color: accentColor }}>×{ship.quantity}</div>
                  </div>
                  <div className="flex justify-center gap-3 mt-1 text-[9px] text-muted-foreground">
                    <span>⚔{def.attack}</span>
                    <span>🛡{def.defense}</span>
                    <span>💨{def.speed}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Build Ship Section */}
      <motion.div variants={staggerItem}>
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          ПОСТРОИТЬ КОРАБЛЬ
        </div>
        <div className="grid grid-cols-1 gap-2 max-h-[25vh] overflow-y-auto pr-1">
          {availableShips.map(def => {
            const Icon = getIcon(def.icon);
            const canAfford = Object.entries(def.cost).every(
              ([res, cost]) => (resources[res as keyof typeof resources] || 0) >= (cost || 0)
            );
            return (
              <div
                key={def.id}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ border: `1px solid ${accentColor}15`, background: 'rgba(0,0,0,0.3)' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accentColor}12` }}>
                  <Icon className="w-5 h-5" style={{ color: canAfford ? accentColor : 'rgba(255,255,255,0.2)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{def.name}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {SHIP_CLASS_NAMES[def.class]} • ⚔{def.attack} 🛡{def.defense}
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[9px] font-mono">
                    {Object.entries(def.cost).map(([res, cost]) => (
                      <span key={res} style={{ color: (resources[res as keyof typeof resources] || 0) >= (cost || 0) ? '#fbbf24' : '#ef4444' }}>
                        {RESOURCE_CONFIG[res as keyof typeof RESOURCE_CONFIG]?.name}: {cost}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const result = buildShip(def.id);
                    setNotification(result.message);
                  }}
                  disabled={!canAfford}
                  className="holo-btn px-3 py-1.5 rounded-lg text-[10px] font-medium disabled:opacity-30"
                  style={{
                    border: `1px solid ${accentColor}33`,
                    background: `${accentColor}0d`,
                    color: accentColor,
                  }}
                >
                  Строить
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// 5. BAR ROOM
// ============================================================
const BAR_TIPS = [
  'В Андромеде-7 есть легенда о затерянном крейсере «Прометей». Говорят, его экипаж до сих пор летает между звёздами...',
  'Капитан Ворон из фракции Военных однажды уничтожил 50 пиратов за один бой. Его тактика изучается в академии.',
  'Биоматерия из Гидропоники v2 используется не только для энергии — из неё делают лучшие напитки в секторе!',
  'Древние Предшественники оставили артефакты в самых неожиданных местах. Иногда их можно найти даже в стенах станции...',
  'Торговый пост «Нексус» предлагает уникальные товары каждые 24 часа. Не забудьте заглянуть!',
  'Кристаллические аномалии опасны, но их ресурсы стоят того риска. Главное — мощный флот!',
  'Пси-энергия — самая загадочная сила в галактике. Учёные до сих пор не понимают, как она работает.',
];

const BAR_VISITORS = [
  { name: 'Механик Грог', problem: 'Нужны минералы для ремонта турели. Пираты не дадут покоя...' },
  { name: 'Учёная Ли', problem: 'Исследую аномалию в секторе G-12. Не хватает кристаллов.' },
  { name: 'Пилот Рекс', problem: 'Мой истребитель в ремонте. Когда ангар будет готов?' },
  { name: 'Торговец Хасан', problem: 'Есть особое предложение, но оно подождёт до завтра.' },
];

function BarRoom({ accentColor }: { accentColor: string }) {
  const [tip] = useState(() => BAR_TIPS[Math.floor(Math.random() * BAR_TIPS.length)]);

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Cozy Lighting Glow from Bottom */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0" style={{ height: '200px', background: `linear-gradient(to top, ${accentColor}18, transparent)` }} />

      {/* Floating Barman Drone */}
      <motion.div variants={staggerItem} className="flex justify-center py-4 relative z-10">
        <motion.div
          className="relative"
          animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
              border: `1px solid ${accentColor}44`,
              boxShadow: `0 0 30px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.4)`,
            }}
          >
            <Wine className="w-7 h-7" style={{ color: accentColor }} />
          </div>
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full"
            style={{ background: `${accentColor}44`, filter: 'blur(2px)' }}
            animate={{ opacity: [0.4, 0.8, 0.4], scaleX: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>

      {/* Daily Tip / Lore */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div className="rounded-2xl p-4" style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.4)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ScrollText className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-[10px] font-mono" style={{ color: accentColor }}>ЗАПИСИ ИССЛЕДОВАТЕЛЯ</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed italic">
            «{tip}»
          </p>
        </div>
      </motion.div>

      {/* Music Visualizer Bars */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          АТМОСФЕРА
        </div>
        <div className="flex items-end justify-center gap-1 h-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-t-sm"
              style={{ background: accentColor, opacity: 0.5 }}
              animate={{
                height: [4, 8 + Math.sin(i * 0.8) * 16 + Math.random() * 12, 4],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Visitors */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          ПОСЕТИТЕЛИ
        </div>
        <div className="space-y-2">
          {BAR_VISITORS.map((visitor, i) => (
            <motion.div
              key={visitor.name}
              className="flex items-start gap-2 p-2.5 rounded-xl"
              style={{ border: `1px solid ${accentColor}12`, background: 'rgba(0,0,0,0.25)' }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}33`, color: accentColor }}
              >
                {visitor.name[0]}
              </div>
              <div>
                <div className="text-xs font-medium">{visitor.name}</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">{visitor.problem}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mini-game Teaser: Poker */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div
          className="rounded-xl p-4 text-center"
          style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Spade className="w-5 h-5" style={{ color: accentColor }} />
            <span className="text-sm font-medium" style={{ color: accentColor }}>Покер</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Классическая космическая карточная игра с ставками на осколки
          </p>
          <div
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono opacity-40 cursor-not-allowed"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Lock className="w-3 h-3" />
            Скоро
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Spade icon (not in lucide)
function Spade({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l7 10 7-10" />
      <path d="M12 13v8" />
      <path d="M5 3c-3 0-5 3-5 7s2 7 5 7c1.5 0 2.8-.7 3.7-1.8L12 13l-1.3 2.2C9.8 16.3 8.5 17 7 17c-3 0-5-3-5-7s2-7 5-7z" />
    </svg>
  );
}

// ============================================================
// 6. SERVER ROOM
// ============================================================
const HACK_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#fbbf24'];

function ServerRoom({ accentColor }: { accentColor: string }) {
  const sciencePoints = useGameStore(s => s.sciencePoints);
  const scienceRate = useGameStore(s => s.scienceRate);
  const researchedTechs = useGameStore(s => s.researchedTechs);
  const setNotification = useGameStore(s => s.setNotification);

  // Hacking mini-game state
  const [hackingSequence, setHackingSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [hackingActive, setHackingActive] = useState(false);
  const [hackingResult, setHackingResult] = useState<'success' | 'fail' | null>(null);
  const [activeBtn, setActiveBtn] = useState<number | null>(null);
  const showingRef = useRef(false);

  const generateSequence = useCallback(() => {
    const seq: number[] = [];
    for (let i = 0; i < 4; i++) seq.push(Math.floor(Math.random() * 4));
    return seq;
  }, []);

  const startHack = useCallback(() => {
    const seq = generateSequence();
    setHackingSequence(seq);
    setPlayerSequence([]);
    setHackingActive(true);
    setHackingResult(null);
    setIsShowingSequence(true);

    // Show sequence
    showingRef.current = true;
    seq.forEach((colorIdx, i) => {
      setTimeout(() => {
        setActiveBtn(colorIdx);
        setTimeout(() => setActiveBtn(null), 400);
      }, i * 700 + 500);
    });
    setTimeout(() => {
      setIsShowingSequence(false);
      showingRef.current = false;
    }, seq.length * 700 + 1000);
  }, [generateSequence]);

  const handleHackPress = useCallback((idx: number) => {
    if (isShowingSequence || hackingResult) return;

    const newSeq = [...playerSequence, idx];
    setPlayerSequence(newSeq);
    setActiveBtn(idx);
    setTimeout(() => setActiveBtn(null), 200);

    const currentStep = newSeq.length - 1;
    if (newSeq[currentStep] !== hackingSequence[currentStep]) {
      setHackingResult('fail');
      setNotification('❌ Взлом провален! Попробуйте снова.');
      setTimeout(() => setHackingActive(false), 1500);
      return;
    }

    if (newSeq.length === hackingSequence.length) {
      setHackingResult('success');
      // Award science points directly via zustand setState
      useGameStore.setState(s => ({ sciencePoints: s.sciencePoints + 20 }));
      setNotification('🔓 Терминал взломан! +20 очков науки');
      setTimeout(() => setHackingActive(false), 1500);
    }
  }, [isShowingSequence, hackingResult, playerSequence, hackingSequence, setNotification]);

  const researchedCount = researchedTechs.length;
  const totalTechs = TECH_DEFS.length;

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Matrix Rain Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.06] z-0">
        <MatrixRain />
      </div>

      {/* Science Points Display */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            border: `1px solid ${accentColor}33`,
            background: 'rgba(0,0,0,0.4)',
            boxShadow: `0 0 30px ${accentColor}11`,
          }}
        >
          <div className="text-[10px] font-mono mb-1" style={{ color: accentColor }}>
            ОЧКИ НАУКИ
          </div>
          <motion.div
            className="text-4xl font-bold font-mono"
            style={{ color: accentColor }}
            key={sciencePoints}
            initial={{ scale: 1.1, color: '#ffffff' }}
            animate={{ scale: 1, color: accentColor }}
            transition={{ duration: 0.3 }}
          >
            {formatNumber(sciencePoints)}
          </motion.div>
          <div className="text-xs text-muted-foreground mt-1">
            +{scienceRate}/мин • {researchedCount}/{totalTechs} технологий
          </div>
        </div>
      </motion.div>

      {/* Server Racks */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          СЕРВЕРНАЯ КОМНАТА
        </div>
        <div className="flex justify-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-10 rounded-md overflow-hidden"
              style={{
                border: `1px solid ${accentColor}22`,
                background: 'rgba(0,0,0,0.5)',
              }}
            >
              {Array.from({ length: 5 }).map((_, j) => (
                <motion.div
                  key={j}
                  className="w-full h-5 flex items-center justify-center"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2 + i * 0.3,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: [
                        accentColor, '#22c55e', '#fbbf24', '#ef4444', '#06b6d4'
                      ][(i + j) % 5],
                      boxShadow: `0 0 4px ${accentColor}66`,
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tech Tree Quick Access */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div className="text-[10px] font-mono mb-2 opacity-50" style={{ color: accentColor }}>
          ВЕТКИ ИССЛЕДОВАНИЙ
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { branch: 'military', name: 'Военные', icon: Swords, color: '#ef4444', count: TECH_DEFS.filter(t => t.branch === 'military' && researchedTechs.includes(t.id)).length, total: TECH_DEFS.filter(t => t.branch === 'military').length },
            { branch: 'engineering', name: 'Инженерия', icon: Cog, color: '#ff6b35', count: TECH_DEFS.filter(t => t.branch === 'engineering' && researchedTechs.includes(t.id)).length, total: TECH_DEFS.filter(t => t.branch === 'engineering').length },
            { branch: 'biological', name: 'Биология', icon: Leaf, color: '#22c55e', count: TECH_DEFS.filter(t => t.branch === 'biological' && researchedTechs.includes(t.id)).length, total: TECH_DEFS.filter(t => t.branch === 'biological').length },
            { branch: 'psycho', name: 'Пси-энергия', icon: Brain, color: '#a855f7', count: TECH_DEFS.filter(t => t.branch === 'psycho' && researchedTechs.includes(t.id)).length, total: TECH_DEFS.filter(t => t.branch === 'psycho').length },
          ].map(branch => {
            const Icon = branch.icon;
            return (
              <div
                key={branch.branch}
                className="rounded-xl p-3"
                style={{ border: `1px solid ${branch.color}22`, background: 'rgba(0,0,0,0.3)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color: branch.color }} />
                  <span className="text-xs font-medium">{branch.name}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: branch.total }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        background: i < branch.count ? branch.color : 'rgba(255,255,255,0.06)',
                        boxShadow: i < branch.count ? `0 0 4px ${branch.color}44` : 'none',
                      }}
                    />
                  ))}
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 font-mono">{branch.count}/{branch.total}</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Hacking Mini-Game */}
      <motion.div variants={staggerItem} className="relative z-10">
        <div
          className="rounded-2xl p-4"
          style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4" style={{ color: accentColor }} />
            <span className="text-xs font-medium" style={{ color: accentColor }}>ВЗЛОМ ТЕРМИНАЛА</span>
            <span className="text-[9px] text-muted-foreground ml-auto">+20 науки</span>
          </div>

          {!hackingActive ? (
            <button
              onClick={startHack}
              className="holo-btn w-full py-3 rounded-xl text-xs font-mono font-medium"
              style={{ border: `1px solid ${accentColor}33`, background: `${accentColor}0d`, color: accentColor }}
            >
              ▶ Начать взлом
            </button>
          ) : (
            <div className="space-y-3">
              {/* Progress indicator */}
              <div className="flex gap-1.5 justify-center">
                {hackingSequence.map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: i < playerSequence.length
                        ? (playerSequence[i] === hackingSequence[i] ? '#22c55e' : '#ef4444')
                        : i === playerSequence.length
                          ? accentColor
                          : 'rgba(255,255,255,0.08)',
                      boxShadow: i < playerSequence.length && playerSequence[i] === hackingSequence[i]
                        ? '0 0 8px #22c55e66'
                        : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Color buttons */}
              <div className="grid grid-cols-4 gap-2">
                {HACK_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleHackPress(idx)}
                    className="h-14 rounded-xl transition-all active:scale-90"
                    style={{
                      background: activeBtn === idx ? color : `${color}33`,
                      border: `2px solid ${activeBtn === idx ? color : `${color}44`}`,
                      boxShadow: activeBtn === idx ? `0 0 20px ${color}66` : 'none',
                    }}
                    disabled={isShowingSequence || !!hackingResult}
                  />
                ))}
              </div>

              {isShowingSequence && (
                <div className="text-center text-[10px] font-mono animate-pulse" style={{ color: accentColor }}>
                  ◉ Запоминайте последовательность...
                </div>
              )}

              {hackingResult === 'success' && (
                <motion.div
                  className="text-center text-sm font-bold text-green-400"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ✓ Доступ получен!
                </motion.div>
              )}
              {hackingResult === 'fail' && (
                <motion.div
                  className="text-center text-sm font-bold text-red-400"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ✗ Доступ запрещён
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Matrix Rain Effect
function MatrixRain() {
  const columns = 12;
  return (
    <div className="flex justify-between h-full w-full">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="flex flex-col items-center" style={{ animationDelay: `${i * 0.3}s` }}>
          {Array.from({ length: 20 }).map((_, j) => (
            <motion.span
              key={j}
              className="text-[10px] font-mono leading-[20px]"
              style={{ color: '#22c55e' }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 4 + i * 0.5,
              }}
            >
              {String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))}
            </motion.span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 7. EMERGENCY CORRIDOR
// ============================================================
const ARTIFACT_LORE = [
  { title: 'Осколок памяти', text: 'Фрагмент кристалла, хранящий воспоминания древней цивилизации. На поверхности мерцают звёзды, которых не существует ни в одном каталоге.' },
  { title: 'Резонатор Предшественников', text: 'Устройство из неизвестного металла. Когда к нему прикасаешься, слышен тихий гул, похожий на голоса тысячи существ.' },
  { title: 'Тёмный кодекс', text: 'Книга из органического материала. Страницы покрыты символами, которые меняются, когда на них смотришь. На обложке выгравировано: «Мы вернёмся».' },
];

const SECRET_MESSAGE = `«Те, кто пришёл до нас, построили сеть червоточин, соединяющую галактики. Они ушли не потому, что погибли — они эволюционировали. Станция «Форпост-7» построена на руинах их аванпоста. Каждая аномалия в этом секторе — осколок их наследия. Не ищите их артефакты ради власти. Ищите их ради понимания. Ибо когда они вернутся, вы должны быть готовы.» — Надпись на стене Аварийного коридора, переведена с прото-андромедийского`;

function CorridorRoom({ accentColor }: { accentColor: string }) {
  const stationLevel = useGameStore(s => s.stationLevel);
  const [revealedArtifacts, setRevealedArtifacts] = useState<Set<number>>(new Set());
  const [showSecret, setShowSecret] = useState(false);
  const [flashOn, setFlashOn] = useState(true);

  // Red flashing light
  useEffect(() => {
    const interval = setInterval(() => setFlashOn(f => !f), 800);
    return () => clearInterval(interval);
  }, []);

  const handleArtifactClick = (idx: number) => {
    const next = new Set(revealedArtifacts);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setRevealedArtifacts(next);
  };

  // Check station level requirement
  if (stationLevel < 3) {
    return (
      <motion.div className="flex flex-col items-center justify-center py-16" {...fadeIn}>
        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
          <AlertTriangle className="w-12 h-12 mb-3" style={{ color: accentColor }} />
        </motion.div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Аварийный коридор заблокирован. Требуется <span className="font-bold" style={{ color: accentColor }}>уровень станции 3</span> для разблокировки.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      {/* Red Flashing Lights */}
      <div className="fixed top-0 left-0 right-0 h-1 pointer-events-none z-20"
        style={{
          background: flashOn ? `linear-gradient(90deg, transparent, ${accentColor}88, transparent)` : 'transparent',
          transition: 'background 0.15s',
        }}
      />
      <div className="fixed top-4 right-4 pointer-events-none z-20">
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{
            background: accentColor,
            boxShadow: flashOn ? `0 0 20px ${accentColor}, 0 0 40px ${accentColor}66` : `0 0 5px ${accentColor}44`,
          }}
          animate={{ scale: flashOn ? 1.3 : 0.9 }}
          transition={{ duration: 0.15 }}
        />
      </div>
      <div className="fixed top-4 left-4 pointer-events-none z-20">
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{
            background: accentColor,
            boxShadow: flashOn ? `0 0 20px ${accentColor}, 0 0 40px ${accentColor}66` : `0 0 5px ${accentColor}44`,
          }}
          animate={{ scale: flashOn ? 1.3 : 0.9 }}
          transition={{ duration: 0.15 }}
        />
      </div>

      {/* Cables from ceiling */}
      <div className="relative h-20 overflow-hidden pointer-events-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px"
            style={{
              left: `${15 + i * 18}%`,
              top: 0,
              height: '100%',
              background: `linear-gradient(to bottom, ${accentColor}44, transparent)`,
              transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (10 + i * 3)}deg)`,
              transformOrigin: 'top center',
            }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3 + i, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Warning Label */}
      <motion.div variants={staggerItem} className="text-center">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono"
          style={{
            border: `1px solid ${accentColor}44`,
            background: `${accentColor}11`,
            color: accentColor,
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          ОПАСНАЯ ЗОНА • УРОВЕНЬ ДОСТУПА: МАКСИМАЛЬНЫЙ
        </motion.div>
      </motion.div>

      {/* Artifact Hotspots */}
      <motion.div variants={staggerItem}>
        <div className="text-[10px] font-mono mb-3 opacity-50" style={{ color: accentColor }}>
          ОБНАРУЖЕННЫЕ АРТЕФАКТЫ
        </div>
        <div className="space-y-3">
          {ARTIFACT_LORE.map((artifact, i) => (
            <motion.div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${accentColor}22`, background: 'rgba(0,0,0,0.4)' }}
              layout
            >
              <button
                onClick={() => handleArtifactClick(i)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <motion.div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: revealedArtifacts.has(i) ? `${accentColor}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${revealedArtifacts.has(i) ? `${accentColor}44` : 'rgba(255,255,255,0.06)'}`,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {revealedArtifacts.has(i) ? (
                    <Gem className="w-5 h-5" style={{ color: accentColor }} />
                  ) : (
                    <Search className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: revealedArtifacts.has(i) ? accentColor : 'rgba(255,255,255,0.4)' }}>
                    {revealedArtifacts.has(i) ? artifact.title : 'Неизвестный объект'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {revealedArtifacts.has(i) ? 'Изучен' : 'Нажмите для исследования'}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${revealedArtifacts.has(i) ? 'rotate-90 text-muted-foreground' : 'text-muted-foreground/30'}`} />
              </button>
              <AnimatePresence>
                {revealedArtifacts.has(i) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-1">
                      <div className="text-[11px] text-foreground/70 leading-relaxed italic border-t pt-2" style={{ borderColor: `${accentColor}15` }}>
                        {artifact.text}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Secret Message on the Wall */}
      <motion.div variants={staggerItem}>
        <button
          onClick={() => setShowSecret(!showSecret)}
          className="w-full text-left"
        >
          <div
            className="rounded-xl p-3 flex items-center gap-3 transition-all"
            style={{
              border: `1px solid ${accentColor}22`,
              background: 'rgba(0,0,0,0.4)',
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33` }}>
              <Skull className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: accentColor }}>Стенная надпись</div>
              <div className="text-[10px] text-muted-foreground">
                {showSecret ? 'Нажмите, чтобы скрыть' : 'Загадочные символы на стене...'}
              </div>
            </div>
            <motion.div animate={{ rotate: showSecret ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </div>
        </button>
        <AnimatePresence>
          {showSecret && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl p-4" style={{ border: `1px solid ${accentColor}15`, background: 'rgba(0,0,0,0.5)' }}>
                <div className="text-[10px] font-mono mb-2" style={{ color: accentColor }}>
                  ПЕРЕВОД С ПРОТО-АНДРОМЕДИЙСКОГО:
                </div>
                <p className="text-[11px] text-foreground/70 leading-relaxed italic">
                  {SECRET_MESSAGE}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bottom cables */}
      <div className="relative h-8 overflow-hidden pointer-events-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-px"
            style={{
              left: `${25 + i * 25}%`,
              bottom: 0,
              height: '100%',
              background: `linear-gradient(to top, ${accentColor}33, transparent)`,
              transform: `rotate(${(i % 2 === 0 ? 1 : -1) * 15}deg)`,
              transformOrigin: 'bottom center',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Gem icon for corridor
function Gem({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" />
      <path d="M11 3l-1 18" />
      <path d="M2 9h20" />
    </svg>
  );
}

// Plus icon for engineering
function Plus({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}