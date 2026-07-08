'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import {
  MODULE_DEFS,
  MODULE_TYPE_NAMES,
  RESOURCE_CONFIG,
  ROOM_DEFS,
  COLLECTION_COOLDOWN,
} from '@/lib/game/constants';
import type { ModuleType, RoomId, ResourceType, StationModule } from '@/lib/game/types';

import {
  Zap,
  Pickaxe,
  Leaf,
  Factory,
  Shield,
  Crosshair,
  FlaskConical,
  Diamond,
  Users,
  Rocket,
  Compass,
  Wrench,
  Wine,
  Server,
  AlertTriangle,
  Plus,
  ArrowUpCircle,
  Timer,
  Lock,
  ChevronRight,
  HandCoins,
  Hammer,
  Orbit,
  Heart,
  Cpu,
  BoxesIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ============================================
// Icon name → component mapping
// ============================================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Zap, Pickaxe, Leaf, Factory, Shield, Crosshair, FlaskConical, Diamond, Users, Rocket,
  Compass, Wrench, Wine, Server, AlertTriangle,
  HandCoins, Hammer, Orbit, Heart, Cpu, BoxesIcon,
};

// ============================================
// Helpers
// ============================================
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n < 10 ? n.toFixed(1) : Math.floor(n).toString();
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function calculateModuleProduction(mod: StationModule): Partial<Record<ResourceType, number>> {
  const def = MODULE_DEFS.find(d => d.id === mod.defId);
  if (!def || mod.building) return {};
  const production: Partial<Record<ResourceType, number>> = {};
  for (const [res, base] of Object.entries(def.baseProduction)) {
    production[res as ResourceType] =
      (base || 0) + (def.productionPerLevel[res as keyof typeof def.productionPerLevel] || 0) * (mod.level - 1);
  }
  return production;
}

function hasProduction(mod: StationModule): boolean {
  const def = MODULE_DEFS.find(d => d.id === mod.defId);
  return def ? Object.keys(def.baseProduction).length > 0 : false;
}

function getHealthColor(ratio: number): string {
  if (ratio > 0.7) return '#22c55e';
  if (ratio > 0.3) return '#fbbf24';
  return '#ef4444';
}

function getModuleGlowIntensity(level: number, maxLevel: number): number {
  const ratio = level / maxLevel;
  return 0.15 + ratio * 0.35;
}

// ============================================
// Sub-components
// ============================================

/** Shimmer progress bar for building modules */
function BuildProgressBar({ startTime, endTime }: { startTime: number; endTime: number }) {
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const total = endTime - startTime;
      const elapsed = now - startTime;
      const p = Math.min(100, Math.max(0, (elapsed / total) * 100));
      const rem = Math.max(0, endTime - now);
      setProgress(p);
      setRemaining(formatTime(rem));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime, endTime]);

  return (
    <div className="relative w-full h-3 rounded-full overflow-hidden bg-white/5">
      {/* Base progress */}
      <div
        className="h-full rounded-full transition-all duration-1000 ease-linear"
        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00f0ff, #00c8ff)' }}
      />
      {/* Shimmer overlay */}
      <div className="absolute inset-0 build-shimmer rounded-full" />
      {/* Time text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-mono font-bold text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
          {remaining}
        </span>
      </div>
    </div>
  );
}

/** Particle burst effect container */
function ParticleBurst({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);
  const particlesRef = useRef<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const stableSeed = useRef(0);
  if (active && stableSeed.current === 0) {
    const colors = ['#00f0ff', '#a855f7', '#22c55e', '#fbbf24', '#ff6b35'];
    particlesRef.current = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 80,
      color: colors[i % colors.length],
    }));
    stableSeed.current = 1;
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      stableSeed.current = 0;
    }, 900);
  } else if (!active) {
    stableSeed.current = 0;
  }

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particlesRef.current.map(p => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full particle"
          style={{
            left: '50%',
            top: '50%',
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            '--tx': `${p.x}px`,
            '--ty': `${p.y}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** A single resource mini-chip */
function ResourceChip({
  type,
  amount,
  size = 'sm',
}: {
  type: ResourceType;
  amount: number;
  size?: 'sm' | 'xs';
}) {
  const config = RESOURCE_CONFIG[type];
  const Icon = ICON_MAP[config.icon];
  const isSm = size === 'sm';
  return (
    <div className="flex items-center gap-1">
      {Icon && <Icon className={isSm ? 'w-3 h-3' : 'w-2.5 h-2.5'} style={{ color: config.color }} />}
      <span
        className={`font-mono ${isSm ? 'text-[10px]' : 'text-[9px]'}`}
        style={{ color: config.color }}
      >
        +{formatNumber(amount)}/м
      </span>
    </div>
  );
}

/** Cost display */
function CostDisplay({ cost }: { cost: Partial<Record<ResourceType, number>> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(cost).map(([res, val]) => {
        if (!val) return null;
        const config = RESOURCE_CONFIG[res as ResourceType];
        const Icon = ICON_MAP[config.icon];
        return (
          <div key={res} className="flex items-center gap-0.5">
            {Icon && <Icon className="w-3 h-3" style={{ color: config.color }} />}
            <span className="text-[10px] font-mono" style={{ color: config.color }}>
              {formatNumber(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Module Card
// ============================================
function ModuleCard({ mod, index }: { mod: StationModule; index: number }) {
  const def = MODULE_DEFS.find(d => d.id === mod.defId);
  const selectedModule = useGameStore(s => s.selectedModule);
  const selectModule = useGameStore(s => s.selectModule);
  const upgradeModule = useGameStore(s => s.upgradeModule);
  const speedUpBuild = useGameStore(s => s.speedUpBuild);
  const collectResource = useGameStore(s => s.collectResource);
  const getModuleCost = useGameStore(s => s.getModuleCost);
  const canAfford = useGameStore(s => s.canAfford);
  const lastCollectionTimes = useGameStore(s => s.lastCollectionTimes);
  const setNotification = useGameStore(s => s.setNotification);

  const [particleActive, setParticleActive] = useState(false);
  const [, forceUpdate] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Re-render every second to keep collection cooldown fresh
  useEffect(() => {
    timerRef.current = setInterval(() => forceUpdate(v => v + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCollect = useCallback(() => {
    const result = collectResource(mod.id);
    if (result.success) {
      setParticleActive(true);
      setNotification(result.message);
    } else {
      setNotification(result.message);
    }
  }, [collectResource, mod.id, setNotification]);

  const handleUpgrade = useCallback(() => {
    const result = upgradeModule(mod.id);
    setNotification(result.message);
  }, [upgradeModule, mod.id, setNotification]);

  const handleSpeedUp = useCallback(() => {
    const result = speedUpBuild(mod.id);
    setNotification(result.message);
  }, [speedUpBuild, mod.id, setNotification]);

  if (!def) return null;

  const production = calculateModuleProduction(mod);
  const hasProd = hasProduction(mod);
  const lastCol = lastCollectionTimes[mod.id] || 0;
  const canCollect = hasProd && !mod.building && Date.now() - lastCol >= COLLECTION_COOLDOWN;
  const collectCooldownLeft = hasProd && !mod.building ? Math.max(0, COLLECTION_COOLDOWN - (Date.now() - lastCol)) : 0;
  const upgradeCost = mod.level < def.maxLevel ? getModuleCost(mod.defId, mod.level + 1) : null;
  const canUpgrade = upgradeCost ? canAfford(upgradeCost) : false;
  const healthRatio = mod.maxHealth > 0 ? mod.health / mod.maxHealth : 1;
  const glowIntensity = getModuleGlowIntensity(mod.level, def.maxLevel);
  const isSelected = selectedModule === mod.id;
  const Icon = ICON_MAP[def.icon];
  const typeName = MODULE_TYPE_NAMES[def.type] || def.type;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected ? 'ring-2 ring-neon-cyan/60' : ''
      }`}
      style={{
        background: 'rgba(15, 15, 35, 0.85)',
        border: '1px solid rgba(0, 240, 255, 0.25)',
        boxShadow: `0 0 ${glowIntensity * 40}px rgba(0, 240, 255, ${glowIntensity}), inset 0 0 ${glowIntensity * 20}px rgba(0, 240, 255, ${glowIntensity * 0.3})`,
      }}
      onClick={() => selectModule(isSelected ? null : mod.id)}
    >
      {/* Glow intensity overlay for higher levels */}
      {mod.level >= 5 && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl module-glow"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, ${glowIntensity * 0.15}) 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative p-3">
        {/* Header row: Icon + Name + Level */}
        <div className="flex items-start gap-2.5 mb-2">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: mod.building
                ? 'rgba(0, 240, 255, 0.08)'
                : `rgba(0, 240, 255, ${0.06 + glowIntensity * 0.1})`,
              border: `1px solid rgba(0, 240, 255, ${0.15 + glowIntensity * 0.2})`,
            }}
          >
            {Icon && (
              <Icon
                className="w-5 h-5"
                style={{ color: mod.building ? 'rgba(0, 240, 255, 0.5)' : '#00f0ff' }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
                {def.name}
              </h3>
              <Badge
                className="flex-shrink-0 text-[9px] px-1.5 py-0 font-mono font-bold"
                style={{
                  background: mod.level >= 7
                    ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(0, 240, 255, 0.3))'
                    : mod.level >= 4
                      ? 'rgba(0, 240, 255, 0.2)'
                      : 'rgba(0, 240, 255, 0.1)',
                  color: mod.level >= 7 ? '#c084fc' : '#00f0ff',
                  borderColor: mod.level >= 7 ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 240, 255, 0.3)',
                  textShadow: '0 0 8px currentColor',
                }}
              >
                Ур. {mod.level}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{typeName}</span>
          </div>
        </div>

        {/* Production rates */}
        {hasProd && !mod.building && Object.keys(production).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-0.5">
            {(Object.entries(production) as [ResourceType, number][]).map(([res, rate]) =>
              rate ? <ResourceChip key={res} type={res} amount={rate} /> : null,
            )}
          </div>
        )}

        {/* Health bar */}
        {!mod.building && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${healthRatio * 100}%`,
                  background: getHealthColor(healthRatio),
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-muted-foreground w-8 text-right">
              {mod.health}/{mod.maxHealth}
            </span>
          </div>
        )}

        {/* Building progress */}
        {mod.building && mod.buildStartTime && mod.buildEndTime && (
          <div className="mb-2">
            <BuildProgressBar startTime={mod.buildStartTime} endTime={mod.buildEndTime} />
          </div>
        )}

        {/* Expanded details when selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-white/5">
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{def.description}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                  <Heart className="w-3 h-3" />
                  <span>Здоровье: {mod.health}/{mod.maxHealth}</span>
                  {def.maxLevel > 1 && (
                    <span className="ml-2">
                      <ArrowUpCircle className="w-3 h-3 inline mr-0.5" />
                      Макс. ур.: {def.maxLevel}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-1">
          {/* Collect button */}
          {hasProd && !mod.building && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={e => {
                e.stopPropagation();
                handleCollect();
              }}
              disabled={!canCollect}
              className={`relative holo-btn flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                canCollect
                  ? 'text-neon-cyan'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              } ${canCollect ? 'glow-pulse' : ''}`}
              style={{
                background: canCollect ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${canCollect ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
              }}
            >
              <ParticleBurst active={particleActive} />
              <HandCoins className="w-3.5 h-3.5" />
              {canCollect ? 'Собрать' : formatTime(collectCooldownLeft)}
            </motion.button>
          )}

          {/* Upgrade button */}
          {!mod.building && mod.level < def.maxLevel && upgradeCost && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={e => {
                e.stopPropagation();
                handleUpgrade();
              }}
              disabled={!canUpgrade}
              className={`holo-btn flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                canUpgrade ? 'text-amber-300' : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              style={{
                background: canUpgrade ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${canUpgrade ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
              }}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              {Object.entries(upgradeCost).map(([res, val]) => {
                const config = RESOURCE_CONFIG[res as ResourceType];
                const Icon = ICON_MAP[config.icon];
                return Icon ? (
                  <span key={res} className="flex items-center gap-0.5" style={{ color: canUpgrade ? config.color : undefined }}>
                    <Icon className="w-2.5 h-2.5" />
                    {formatNumber(val!)}
                  </span>
                ) : null;
              })}
            </motion.button>
          )}

          {/* Speed Up button */}
          {mod.building && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={e => {
                e.stopPropagation();
                handleSpeedUp();
              }}
              className="holo-btn flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-neon-purple"
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
              }}
            >
              <Timer className="w-3.5 h-3.5" />
              Мгновенно
            </motion.button>
          )}

          {/* Max level indicator */}
          {mod.level >= def.maxLevel && !mod.building && (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-amber-300/60">
              <span className="font-mono">МАКС</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Empty Slot Card
// ============================================
function EmptySlotCard({ onClick, index }: { onClick: () => void; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer h-[140px] transition-all duration-300 group"
      style={{
        background: 'rgba(15, 15, 35, 0.4)',
        border: '1px dashed rgba(0, 240, 255, 0.15)',
      }}
    >
      <motion.div
        whileHover={{ scale: 1.15, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
        style={{
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
        }}
      >
        <Plus className="w-5 h-5 text-neon-cyan/40 group-hover:text-neon-cyan transition-colors" />
      </motion.div>
      <span className="text-[10px] text-muted-foreground/40 group-hover:text-muted-foreground/70 font-mono transition-colors">
        Построить
      </span>
    </motion.div>
  );
}

// ============================================
// Build Menu
// ============================================
const BUILD_TABS: { value: string; label: string; types: ModuleType[] }[] = [
  { value: 'all', label: 'Все', types: [] },
  { value: 'mining', label: 'Добыча', types: ['mining'] },
  { value: 'processing', label: 'Переработка', types: ['processing'] },
  { value: 'defense', label: 'Оборона', types: ['defense'] },
  { value: 'research', label: 'Наука', types: ['research'] },
  { value: 'habitat', label: 'Жилые', types: ['habitat'] },
  { value: 'hangar', label: 'Ангар', types: ['hangar'] },
];

function BuildMenuItem({ def, onBuild }: { def: typeof MODULE_DEFS[0]; onBuild: () => void }) {
  const getModuleCost = useGameStore(s => s.getModuleCost);
  const canAfford = useGameStore(s => s.canAfford);
  const cost = getModuleCost(def.id, 1);
  const affordable = canAfford(cost);
  const Icon = ICON_MAP[def.icon];

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl transition-colors duration-200 active:bg-white/5"
      style={{
        background: 'rgba(0, 240, 255, 0.03)',
        border: '1px solid rgba(0, 240, 255, 0.08)',
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: 'rgba(0, 240, 255, 0.08)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
        }}
      >
        {Icon && <Icon className="w-5 h-5 text-neon-cyan" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground truncate">{def.name}</h4>
          <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">
            {MODULE_TYPE_NAMES[def.type]}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
          {def.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <CostDisplay cost={cost} />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={e => {
              e.stopPropagation();
              onBuild();
            }}
            disabled={!affordable}
            className={`holo-btn flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
              affordable ? 'text-neon-cyan' : 'text-muted-foreground/40 cursor-not-allowed'
            }`}
            style={{
              background: affordable ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${affordable ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
              minHeight: '40px',
            }}
          >
            <Hammer className="w-3 h-3" />
            Построить
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function BuildMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('all');
  const buildModule = useGameStore(s => s.buildModule);
  const setNotification = useGameStore(s => s.setNotification);

  const handleBuild = useCallback(
    (defId: string) => {
      const result = buildModule(defId);
      setNotification(result.message);
      if (result.success) onClose();
    },
    [buildModule, setNotification, onClose],
  );

  const filteredDefs = useMemo(() => {
    const tab = BUILD_TABS.find(t => t.value === activeTab);
    if (!tab || tab.types.length === 0) return MODULE_DEFS;
    return MODULE_DEFS.filter(d => tab.types.includes(d.type));
  }, [activeTab]);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t border-white/10 p-0 max-h-[85vh] flex flex-col overflow-hidden"
        style={{ background: 'rgba(10, 10, 26, 0.97)', backdropFilter: 'blur(20px)' }}
      >
        <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <SheetTitle className="text-base font-bold neon-text-cyan text-center">
            <Hammer className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Построить модуль
          </SheetTitle>
          <SheetDescription className="text-center text-[11px] text-muted-foreground">
            Выберите модуль для строительства на станции
          </SheetDescription>
        </SheetHeader>

        {/* Type tabs — horizontally scrollable */}
        <div className="px-3 pb-2 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-9 bg-white/5 p-0.5 overflow-x-auto tabs-scroll">
              {BUILD_TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-[11px] font-mono px-3 py-1.5 flex-shrink-0 data-[state=active]:bg-neon-cyan/10 data-[state=active]:text-neon-cyan data-[state=active]:border data-[state=active]:border-neon-cyan/30 rounded-md whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Module list — takes all remaining space, scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-8 mobile-scroll">
          <div className="flex flex-col gap-2 pt-1">
            <AnimatePresence mode="popLayout">
              {filteredDefs.map(def => (
                <BuildMenuItem key={def.id} def={def} onBuild={() => handleBuild(def.id)} />
              ))}
            </AnimatePresence>
            {filteredDefs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Нет модулей этой категории
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// Room Card
// ============================================
function RoomCard({ room }: { room: typeof ROOM_DEFS[0] }) {
  const setRoom = useGameStore(s => s.setRoom);
  const unlockedRooms = useGameStore(s => s.unlockedRooms);
  const isUnlocked = unlockedRooms.includes(room.id);
  const Icon = ICON_MAP[room.icon];

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        if (isUnlocked) setRoom(room.id);
      }}
      className={`relative text-left rounded-xl overflow-hidden transition-all duration-300 ${
        isUnlocked ? 'holo-btn cursor-pointer' : 'cursor-default'
      }`}
      style={{
        background: isUnlocked
          ? `linear-gradient(135deg, ${room.bgColor.replace('/80', '/40')}, rgba(15, 15, 35, 0.6))`
          : 'rgba(15, 15, 35, 0.4)',
        border: `1px solid ${isUnlocked ? room.accentColor + '40' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: isUnlocked ? `0 0 15px ${room.accentColor}15` : 'none',
      }}
    >
      <div className="p-3">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: isUnlocked ? room.accentColor + '20' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isUnlocked ? room.accentColor + '30' : 'rgba(255,255,255,0.05)'}`,
            }}
          >
            {isUnlocked ? (
              Icon ? (
                <Icon className="w-4 h-4" style={{ color: room.accentColor }} />
              ) : null
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs font-semibold truncate ${isUnlocked ? '' : 'text-muted-foreground/40'}`}
              style={isUnlocked ? { color: room.accentColor } : undefined}
            >
              {room.name}
            </h4>
          </div>
          {isUnlocked && <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
        </div>
        <p
          className={`text-[10px] leading-relaxed line-clamp-2 ${isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}
        >
          {isUnlocked ? room.description : 'Заблокировано'}
        </p>
        {/* Unlock cost for locked rooms */}
        {!isUnlocked && room.unlockCost && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(Object.entries(room.unlockCost) as [ResourceType, number][]).map(([res, val]) => {
              const config = RESOURCE_CONFIG[res];
              const RIcon = ICON_MAP[config.icon];
              return (
                <span key={res} className="flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/40">
                  {RIcon && <RIcon className="w-2.5 h-2.5" />}
                  {formatNumber(val)}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {/* Accent line at top */}
      {isUnlocked && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${room.accentColor}60, transparent)` }}
        />
      )}
    </motion.button>
  );
}

// ============================================
// Main StationView Component
// ============================================
export default function StationView() {
  const modules = useGameStore(s => s.modules);
  const moduleSlots = useGameStore(s => s.moduleSlots);
  const stationLevel = useGameStore(s => s.stationLevel);
  const stationName = useGameStore(s => s.stationName);
  const unlockedRooms = useGameStore(s => s.unlockedRooms);

  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [, setTick] = useState(0);

  // Force re-render every second for build timers & cooldowns
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const emptySlots = Math.max(0, moduleSlots - modules.length);
  const buildingCount = modules.filter(m => m.building).length;

  return (
    <section className="relative z-10 flex flex-col min-h-[calc(100vh-120px)] pb-2">
      {/* Station Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 pt-2 pb-3"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center neon-border"
              style={{ background: 'rgba(0, 240, 255, 0.06)' }}
            >
              <Orbit className="w-4 h-4 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-base font-bold neon-text-cyan leading-tight">{stationName}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Уровень {stationLevel}
                </span>
                {buildingCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] font-mono text-amber-300">
                    <Timer className="w-2.5 h-2.5" />
                    {buildingCount} стр.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg neon-border"
              style={{ background: 'rgba(10, 10, 30, 0.9)' }}
            >
              <BoxesIcon className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="text-xs font-mono font-bold text-foreground">
                {modules.length}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                /{moduleSlots}
              </span>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground mt-0.5 block">
              модулей
            </span>
          </div>
        </div>
      </motion.header>

      {/* Module Grid */}
      <div className="px-3 flex-1">
        <motion.div
          layout
          className="grid grid-cols-2 md:grid-cols-3 gap-2.5"
        >
          <AnimatePresence mode="popLayout">
            {modules.map((mod, i) => (
              <ModuleCard key={mod.id} mod={mod} index={i} />
            ))}
            {emptySlots > 0 &&
              Array.from({ length: emptySlots }, (_, i) => (
                <EmptySlotCard
                  key={`empty-${i}`}
                  index={modules.length + i}
                  onClick={() => setBuildMenuOpen(true)}
                />
              ))}
          </AnimatePresence>
        </motion.div>

        {/* Room Navigation Section */}
        {ROOM_DEFS.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-6 mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <h2 className="text-[11px] font-mono font-bold text-muted-foreground tracking-widest uppercase">
                Помещения станции
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {ROOM_DEFS.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Build Menu Sheet */}
      <BuildMenu open={buildMenuOpen} onClose={() => setBuildMenuOpen(false)} />
    </section>
  );
}