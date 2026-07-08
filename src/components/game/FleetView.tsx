'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/game/store';
import {
  SHIP_DEFS, SHIP_CLASS_NAMES, COMBAT_TACTIC_CONFIG, RESOURCE_CONFIG,
} from '@/lib/game/constants';
import type { CombatTactic, CombatResult, ShipDef, Ship, Squadron, MapNode } from '@/lib/game/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Plane, PlaneTakeoff, Ship as ShipIcon, EyeOff, Bug, Anchor, Warehouse, Crown,
  Plus, Swords, Shield, Eye, Zap, Diamond, ChevronRight, Trophy,
  Skull, Star, Target, Crosshair, Rocket, Users, Wrench, Minus,
  Sparkles, Bomb, Flame, ScrollText,
} from 'lucide-react';

// ── Icon map ──────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Plane, PlaneTakeoff, Ship: ShipIcon, EyeOff, Bug, Anchor, Warehouse, Crown,
  Swords, Shield, Eye, Zap, Diamond, Crosshair, Rocket, Sparkles, Bomb, Flame, Wrench,
};

// ── Tactic icon map ───────────────────────────────────────
const TACTIC_ICON_MAP: Record<CombatTactic, React.ComponentType<{ className?: string }>> = {
  aggressive: Swords,
  defensive: Shield,
  recon: Eye,
};

// ── Format number ─────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Math.floor(n).toLocaleString('ru-RU');
}

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${seconds}с`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}м ${s}с` : `${m}м`;
}

// ── Resource row for costs ────────────────────────────────
function CostRow({ cost }: { cost: Partial<Record<'energy' | 'minerals' | 'bioMatter' | 'crystals', number>> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(cost) as [keyof typeof cost, number][]).map(([key, val]) => {
        if (!val) return null;
        const cfg = RESOURCE_CONFIG[key];
        const Icon = ICON_MAP[cfg.icon] || Zap;
        return (
          <span key={key} className="flex items-center gap-0.5 text-[10px] font-mono">
            <Icon className="w-3 h-3" style={{ color: cfg.color }} />
            <span style={{ color: cfg.color }}>{fmt(val)}</span>
          </span>
        );
      })}
    </div>
  );
}

// ── Danger stars ──────────────────────────────────────────
function DangerStars({ danger }: { danger: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Star
          key={i}
          className={`w-2.5 h-2.5 ${i < danger ? 'fill-red-400 text-red-400' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
}

// ── Combat animation overlay ──────────────────────────────
function CombatAnimation({
  result,
  onComplete,
}: {
  result: CombatResult;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'laser' | 'explosion' | 'result'>('laser');
  const [damageNums, setDamageNums] = useState<{ id: number; x: number; y: number; val: number; isHeal?: boolean }[]>([]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('explosion'), 800);
    const t2 = setTimeout(() => {
      setPhase('result');
      // Generate floating damage numbers
      const nums = Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        x: 20 + Math.random() * 60,
        y: 30 + Math.random() * 30,
        val: Math.floor(Math.random() * 50) + 10,
        isHeal: result.victory && i % 3 === 0,
      }));
      setDamageNums(nums);
    }, 1600);
    const t3 = setTimeout(onComplete, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [result, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}
    >
      {/* Starfield background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.5,
              animation: `twinkle ${1 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative text-center">
        {/* Laser phase */}
        <AnimatePresence>
          {phase === 'laser' && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-full origin-top"
              style={{
                background: 'linear-gradient(to bottom, transparent, #00f0ff, #00f0ff, transparent)',
                boxShadow: '0 0 20px #00f0ff, 0 0 40px #00f0ff66',
              }}
            />
          )}
        </AnimatePresence>

        {/* Explosion phase */}
        <AnimatePresence>
          {phase === 'explosion' && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
              style={{
                background: 'radial-gradient(circle, #ff6b35 0%, #ef4444 40%, transparent 70%)',
                boxShadow: '0 0 60px #ff6b35, 0 0 120px #ef444466',
              }}
            />
          )}
        </AnimatePresence>

        {/* Floating damage numbers */}
        <AnimatePresence>
          {phase === 'result' && damageNums.map(n => (
            <motion.span
              key={n.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -60, scale: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, delay: n.id * 0.1 }}
              className="absolute font-mono font-bold text-sm"
              style={{
                left: `${n.x}%`,
                top: `${n.y}%`,
                color: n.isHeal ? '#22c55e' : '#ef4444',
                textShadow: `0 0 10px ${n.isHeal ? '#22c55e' : '#ef4444'}`,
              }}
            >
              {n.isHeal ? '+' : '-'}{n.val}
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Result display */}
        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
              className="relative z-10"
            >
              <div className="text-5xl mb-3">
                {result.victory ? '⚔️' : '💀'}
              </div>
              <h2
                className="text-xl font-bold font-mono mb-2"
                style={{
                  color: result.victory ? '#22c55e' : '#ef4444',
                  textShadow: `0 0 20px ${result.victory ? '#22c55e66' : '#ef444466'}`,
                }}
              >
                {result.victory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
              </h2>
              <p className="text-xs font-mono text-muted-foreground mb-1">
                {result.opponent} · Ур. {result.opponentLevel}
              </p>
              {result.victory && (
                <p className="text-xs font-mono text-green-400">
                  +{result.ratingChange} рейтинга
                  {result.shipsLost === 0 ? ' · Без потерь!' : ` · Потеряно кораблей: ${result.shipsLost}`}
                </p>
              )}
              {!result.victory && (
                <p className="text-xs font-mono text-red-400">
                  {result.ratingChange} рейтинга · Потеряно кораблей: {result.shipsLost}
                </p>
              )}
              {result.victory && Object.keys(result.resourcesGained).length > 0 && (
                <div className="mt-2 flex justify-center gap-2">
                  {(Object.entries(result.resourcesGained) as [string, number][]).map(([k, v]) => {
                    const cfg = RESOURCE_CONFIG[k as keyof typeof RESOURCE_CONFIG];
                    if (!cfg || !v) return null;
                    return (
                      <span key={k} className="text-[10px] font-mono flex items-center gap-0.5" style={{ color: cfg.color }}>
                        +{fmt(v)} {cfg.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Ship card ─────────────────────────────────────────────
function ShipCard({
  ship,
  def,
  onBuildMore,
}: {
  ship: Ship;
  def: ShipDef;
  onBuildMore: () => void;
}) {
  const Icon = ICON_MAP[def.icon] || Ship;
  const canAffordFn = useGameStore(s => s.canAfford);
  const canAfford = canAffordFn(def.cost);
  const researchedTechs = useGameStore(s => s.researchedTechs);
  const isUnlocked = !def.unlockedByTech || researchedTechs.includes(def.unlockedByTech);

  if (!isUnlocked) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl p-3 neon-border"
      style={{ background: 'rgba(15, 15, 35, 0.85)' }}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.2)' }}
        >
          <Icon className="w-5 h-5 text-neon-cyan" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-foreground truncate">{def.name}</span>
              <span className="text-[8px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-white/5">
                {SHIP_CLASS_NAMES[def.class] || def.class}
              </span>
            </div>
            <Badge className="text-[9px] font-mono px-1.5" style={{ background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
              ×{ship.quantity}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono">
            <span className="flex items-center gap-0.5 text-red-400">
              <Swords className="w-3 h-3" /> {def.attack}
            </span>
            <span className="flex items-center gap-0.5 text-blue-400">
              <Shield className="w-3 h-3" /> {def.defense}
            </span>
            <span className="flex items-center gap-0.5 text-green-400">
              <Zap className="w-3 h-3" /> {def.speed}
            </span>
          </div>

          {/* Build more */}
          <div className="mt-2 flex items-center justify-between">
            <CostRow cost={def.cost} />
            <Button
              onClick={onBuildMore}
              disabled={!canAfford}
              size="sm"
              className="holo-btn text-[10px] font-mono font-bold px-2.5 py-1 h-7 rounded-lg"
              style={{
                background: canAfford ? 'rgba(0, 240, 255, 0.12)' : 'rgba(50, 50, 70, 0.3)',
                color: canAfford ? '#00f0ff' : '#64748b',
                border: `1px solid ${canAfford ? 'rgba(0, 240, 255, 0.3)' : 'rgba(100,100,120,0.2)'}`,
              }}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              Построить
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Squadron card ─────────────────────────────────────────
function SquadronCard({
  squadron,
  onDelete,
}: {
  squadron: Squadron;
  onDelete: () => void;
}) {
  const ships = useGameStore(s => s.ships);
  const setTactic = useGameStore(s => s.setTactic);
  const getFleetPower = useGameStore(s => s.getFleetPower);
  const assignShipToSquadron = useGameStore(s => s.assignShipToSquadron);
  const setScreen = useGameStore(s => s.setScreen);
  const setActiveFleetTab = useFleetStore(s => s.setActiveFleetTab);

  const power = getFleetPower(squadron.id);
  const tacticCfg = COMBAT_TACTIC_CONFIG[squadron.tactic];
  const assignedShips = squadron.shipIds
    .map(id => ships.find(s => s.id === id))
    .filter(Boolean) as Ship[];

  // Unassigned ships available to add
  const unassignedShips = ships.filter(s => !s.assignedSquadron && s.quantity > 0);

  const handleAttack = () => {
    setActiveFleetTab('combat');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3 neon-border-purple"
      style={{ background: 'rgba(15, 15, 35, 0.85)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold font-mono text-foreground">{squadron.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge className="text-[9px] font-mono px-1.5" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            {assignedShips.length} корабл.
          </Badge>
        </div>
      </div>

      {/* Tactic selector */}
      <div className="flex gap-1.5 mb-3">
        {(Object.entries(COMBAT_TACTIC_CONFIG) as [CombatTactic, typeof COMBAT_TACTIC_CONFIG.aggressive][]).map(([key, cfg]) => {
          const TIcon = TACTIC_ICON_MAP[key];
          const isActive = squadron.tactic === key;
          return (
            <button
              key={key}
              onClick={() => setTactic(squadron.id, key)}
              className="flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[9px] font-mono transition-all duration-200"
              style={{
                background: isActive ? 'rgba(168, 85, 247, 0.15)' : 'rgba(30, 30, 60, 0.3)',
                color: isActive ? '#a855f7' : '#64748b',
                border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.3)' : 'rgba(100,100,120,0.15)'}`,
              }}
            >
              <TIcon className="w-3.5 h-3.5" />
              {cfg.name}
            </button>
          );
        })}
      </div>

      {/* Assigned ships */}
      {assignedShips.length > 0 ? (
        <div className="space-y-1 mb-3">
          {assignedShips.map(ship => {
            const def = SHIP_DEFS.find(d => d.id === ship.defId);
            if (!def) return null;
            const Icon = ICON_MAP[def.icon] || Ship;
            return (
              <div key={ship.id} className="flex items-center justify-between px-2 py-1 rounded-md" style={{ background: 'rgba(168, 85, 247, 0.06)' }}>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-purple-300" />
                  <span className="text-[10px] font-mono text-foreground">{def.name}</span>
                  <span className="text-[9px] font-mono text-purple-300">×{ship.quantity}</span>
                </div>
                <button
                  onClick={() => {
                    // Remove ship from squadron by assigning to null
                    // We use the store action - need to handle this differently
                    // For now, just visual
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] font-mono text-muted-foreground text-center mb-3 py-2">
          Нет назначенных кораблей
        </p>
      )}

      {/* Add ship dropdown */}
      {unassignedShips.length > 0 && (
        <div className="mb-3">
          <details className="group">
            <summary className="flex items-center gap-1 text-[10px] font-mono text-purple-400 cursor-pointer hover:text-purple-300 transition-colors">
              <Plus className="w-3 h-3" />
              Добавить корабль
              <span className="ml-1 opacity-50">({unassignedShips.length})</span>
            </summary>
            <div className="mt-1 space-y-0.5 max-h-28 overflow-y-auto">
              {unassignedShips.map(ship => {
                const def = SHIP_DEFS.find(d => d.id === ship.defId);
                if (!def) return null;
                const Icon = ICON_MAP[def.icon] || Ship;
                return (
                  <button
                    key={ship.id}
                    onClick={() => assignShipToSquadron(ship.id, squadron.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left"
                  >
                    <Icon className="w-3 h-3 text-neon-cyan" />
                    <span className="text-[10px] font-mono text-foreground">{def.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">×{ship.quantity}</span>
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      )}

      {/* Power display */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-red-400">⚔ {power.attack}</span>
          <span className="text-blue-400">🛡 {power.defense}</span>
          <span className="text-green-400">⚡ {power.speed.toFixed(0)}</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Сила: <span className="neon-text-purple font-bold">{power.attack + power.defense}</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleAttack}
          disabled={squadron.shipIds.length === 0}
          className="flex-1 holo-btn text-[10px] font-mono font-bold py-2 rounded-lg"
          style={{
            background: squadron.shipIds.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(50, 50, 70, 0.3)',
            color: squadron.shipIds.length > 0 ? '#ef4444' : '#64748b',
            border: `1px solid ${squadron.shipIds.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100,100,120,0.2)'}`,
          }}
        >
          <Swords className="w-3 h-3 mr-1" />
          Атаковать
        </Button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="text-[10px] font-mono text-muted-foreground hover:text-red-400 px-2 h-7"
        >
          <Minus className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}

// ── Combat target card ────────────────────────────────────
function TargetCard({
  node,
  onSelect,
  isSelected,
}: {
  node: MapNode;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const typeColors: Record<string, string> = {
    pirate: '#ef4444',
    anomaly: '#a855f7',
    neutral: '#fbbf24',
  };
  const typeLabels: Record<string, string> = {
    pirate: 'Пираты',
    anomaly: 'Аномалия',
    neutral: 'Нейтрал',
  };
  const color = typeColors[node.type] || '#94a3b8';

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="w-full text-left rounded-xl p-3 transition-all duration-200"
      style={{
        background: isSelected ? `${color}15` : 'rgba(15, 15, 35, 0.85)',
        border: `1px solid ${isSelected ? color + '50' : 'rgba(100, 100, 120, 0.2)'}`,
        boxShadow: isSelected ? `0 0 20px ${color}20` : 'none',
      }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="text-xs font-bold font-mono text-foreground truncate max-w-[180px]">
            {node.name}
          </span>
        </div>
        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
          Ур.{node.level}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <DangerStars danger={node.danger} />
        <span className="text-[9px] font-mono" style={{ color }}>{typeLabels[node.type] || node.type}</span>
      </div>

      {/* Rewards preview */}
      {Object.keys(node.resources).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {(Object.entries(node.resources) as [string, number][]).map(([k, v]) => {
            const cfg = RESOURCE_CONFIG[k as keyof typeof RESOURCE_CONFIG];
            if (!cfg || !v) return null;
            return (
              <span key={k} className="text-[9px] font-mono flex items-center gap-0.5" style={{ color: cfg.color }}>
                +{fmt(v)}
              </span>
            );
          })}
        </div>
      )}
    </motion.button>
  );
}

// ── Combat log entry ──────────────────────────────────────
function CombatLogEntry({ entry }: { entry: CombatResult }) {
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ background: entry.victory ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)' }}>
      <span className="text-sm">{entry.victory ? '⚔️' : '💀'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono font-bold ${entry.victory ? 'text-green-400' : 'text-red-400'}`}>
            {entry.victory ? 'Победа' : 'Поражение'}
          </span>
          <span className="text-[8px] font-mono text-muted-foreground">{timeStr}</span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground truncate">{entry.opponent}</p>
        <div className="flex items-center gap-2 text-[9px] font-mono mt-0.5">
          <span className={entry.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}>
            {entry.ratingChange >= 0 ? '+' : ''}{entry.ratingChange} рейт.
          </span>
          {entry.shipsLost > 0 && <span className="text-red-400">-{entry.shipsLost} кор.</span>}
        </div>
      </div>
    </div>
  );
}

// ── PvP opponent generator ────────────────────────────────
function generatePvpOpponent(): { name: string; level: number; danger: number; resources: Partial<Record<string, number>> } {
  const names = ['Флот «Тёмный Клинок»', 'Станция «Нова-9»', 'Рейдеры Кербера', 'Орден Сигмы', 'Клан Змеиная Яма', 'Легион Стальных', 'Армада Проксимы'];
  const name = names[Math.floor(Math.random() * names.length)];
  const level = 1 + Math.floor(Math.random() * 7);
  const danger = Math.min(10, level + Math.floor(Math.random() * 3));
  const resources: Partial<Record<string, number>> = {
    energy: 200 + level * 100,
    minerals: 150 + level * 80,
  };
  if (level >= 3) resources.crystals = 10 + level * 5;
  if (level >= 5) resources.bioMatter = 100 + level * 30;
  return { name, level, danger, resources };
}

// ── Local UI state store (Zustand) ────────────────────────
import { create } from 'zustand';

interface FleetUIState {
  activeFleetTab: 'fleet' | 'combat';
  setActiveFleetTab: (tab: 'fleet' | 'combat') => void;
  combatMode: 'pve' | 'pvp';
  setCombatMode: (mode: 'pve' | 'pvp') => void;
  selectedTarget: string | null;
  setSelectedTarget: (id: string | null) => void;
  selectedSquadron: string | null;
  setSelectedSquadron: (id: string | null) => void;
  combatResult: CombatResult | null;
  setCombatResult: (r: CombatResult | null) => void;
  showCombatAnimation: boolean;
  setShowCombatAnimation: (v: boolean) => void;
  squadronDialogOpen: boolean;
  setSquadronDialogOpen: (v: boolean) => void;
}

const useFleetStore = create<FleetUIState>((set) => ({
  activeFleetTab: 'fleet',
  setActiveFleetTab: (tab) => set({ activeFleetTab: tab }),
  combatMode: 'pve',
  setCombatMode: (mode) => set({ combatMode: mode, selectedTarget: null, selectedSquadron: null }),
  selectedTarget: null,
  setSelectedTarget: (id) => set({ selectedTarget: id }),
  selectedSquadron: null,
  setSelectedSquadron: (id) => set({ selectedSquadron: id }),
  combatResult: null,
  setCombatResult: (r) => set({ combatResult: r }),
  showCombatAnimation: false,
  setShowCombatAnimation: (v) => set({ showCombatAnimation: v }),
  squadronDialogOpen: false,
  setSquadronDialogOpen: (v) => set({ squadronDialogOpen: v }),
}));

// ── Main component ────────────────────────────────────────
export default function FleetView() {
  const ships = useGameStore(s => s.ships);
  const squadrons = useGameStore(s => s.squadrons);
  const combatLog = useGameStore(s => s.combatLog);
  const pvpWins = useGameStore(s => s.pvpWins);
  const pvpLosses = useGameStore(s => s.pvpLosses);
  const mapNodes = useGameStore(s => s.mapNodes);
  const buildShip = useGameStore(s => s.buildShip);
  const createSquadron = useGameStore(s => s.createSquadron);
  const attackNode = useGameStore(s => s.attackNode);
  const setNotification = useGameStore(s => s.setNotification);
  const getFleetPower = useGameStore(s => s.getFleetPower);

  const activeFleetTab = useFleetStore(s => s.activeFleetTab);
  const setActiveFleetTab = useFleetStore(s => s.setActiveFleetTab);
  const combatMode = useFleetStore(s => s.combatMode);
  const setCombatMode = useFleetStore(s => s.setCombatMode);
  const selectedTarget = useFleetStore(s => s.selectedTarget);
  const setSelectedTarget = useFleetStore(s => s.setSelectedTarget);
  const selectedSquadron = useFleetStore(s => s.selectedSquadron);
  const setSelectedSquadron = useFleetStore(s => s.setSelectedSquadron);
  const combatResult = useFleetStore(s => s.combatResult);
  const setCombatResult = useFleetStore(s => s.setCombatResult);
  const showCombatAnimation = useFleetStore(s => s.showCombatAnimation);
  const setShowCombatAnimation = useFleetStore(s => s.setShowCombatAnimation);
  const squadronDialogOpen = useFleetStore(s => s.squadronDialogOpen);
  const setSquadronDialogOpen = useFleetStore(s => s.setSquadronDialogOpen);

  const [squadronName, setSquadronName] = useState('');
  // pvpOpponent derived via useMemo below (no separate state needed)
  const squadronCounter = useRef(1);

  // Attackable nodes (discovered, non-player, non-empty)
  const attackableNodes = useMemo(
    () => mapNodes.filter(n => n.discovered && n.type !== 'station' && n.type !== 'empty' && n.type !== 'neutral'),
    [mapNodes],
  );

  // Generate PvP opponent reactively (must be before handleAttack)
  const pvpOpponent = useMemo(() => {
    if (combatMode === 'pvp') return generatePvpOpponent();
    return null;
  }, [combatMode]);

  // Auto-select PvP target when switching to PvP mode
  const effectiveTarget = combatMode === 'pvp' && pvpOpponent ? 'pvp_generated' : selectedTarget;

  // Unlocked ship defs
  const researchedTechs = useGameStore(s => s.researchedTechs);
  const availableShipDefs = useMemo(
    () => SHIP_DEFS.filter(d => !d.unlockedByTech || researchedTechs.includes(d.unlockedByTech)),
    [researchedTechs],
  );

  // Ships that have quantity > 0
  const ownedShips = useMemo(() => ships.filter(s => s.quantity > 0), [ships]);

  // Handle creating squadron
  const handleCreateSquadron = useCallback(() => {
    const name = squadronName.trim() || `Эскадра ${squadronCounter.current}`;
    squadronCounter.current++;
    createSquadron(name);
    setSquadronName('');
    setSquadronDialogOpen(false);
    setNotification(`✅ Эскадра "${name}" создана!`);
  }, [squadronName, createSquadron, setNotification, setSquadronDialogOpen]);

  // Handle build ship
  const handleBuildShip = useCallback((defId: string) => {
    const result = buildShip(defId);
    setNotification(result.message);
  }, [buildShip, setNotification]);

  // Handle combat
  const handleAttack = useCallback(() => {
    if (!selectedSquadron || !selectedTarget) return;

    if (combatMode === 'pve') {
      const result = attackNode(selectedTarget, selectedSquadron);
      if (result) {
        setCombatResult(result);
        setShowCombatAnimation(true);
        setNotification(result.victory
          ? `⚔️ Победа над ${result.opponent}! +${result.ratingChange} рейтинга`
          : `💀 Поражение у ${result.opponent}. ${result.ratingChange} рейтинга`
        );
      } else {
        setNotification('Не удалось атаковать!');
      }
    } else if (combatMode === 'pvp' && pvpOpponent) {
      // Simulate PvP combat using the same attack logic with a synthetic node
      const syntheticNode: MapNode = {
        id: `pvp_${Date.now()}`,
        name: pvpOpponent.name,
        type: 'pirate',
        x: 0, y: 0,
        owner: 'pvp',
        level: pvpOpponent.level,
        resources: pvpOpponent.resources,
        danger: pvpOpponent.danger,
        discovered: true,
      };
      // Temporarily add node, attack, then remove
      const store = useGameStore.getState();
      useGameStore.setState({ mapNodes: [...store.mapNodes, syntheticNode] });
      const result = attackNode(syntheticNode.id, selectedSquadron);
      // Remove the synthetic node
      useGameStore.setState({ mapNodes: useGameStore.getState().mapNodes.filter(n => n.id !== syntheticNode.id) });
      if (result) {
        setCombatResult(result);
        setShowCombatAnimation(true);
      }
    }
  }, [selectedSquadron, selectedTarget, combatMode, pvpOpponent, attackNode, setNotification, setCombatResult, setShowCombatAnimation]);

  const handleCombatAnimationComplete = useCallback(() => {
    setShowCombatAnimation(false);
    setSelectedTarget(null);
    setSelectedSquadron(null);
  }, [setShowCombatAnimation, setSelectedTarget, setSelectedSquadron]);

  return (
    <div className="holo-transition h-full flex flex-col pb-2">
      {/* Tab switcher */}
      <div className="px-3 pt-2 mb-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(15, 15, 35, 0.85)' }}>
          <button
            onClick={() => setActiveFleetTab('fleet')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200"
            style={{
              background: activeFleetTab === 'fleet' ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
              color: activeFleetTab === 'fleet' ? '#00f0ff' : '#64748b',
              border: `1px solid ${activeFleetTab === 'fleet' ? 'rgba(0, 240, 255, 0.3)' : 'transparent'}`,
            }}
          >
            <Rocket className="w-3.5 h-3.5" />
            Флот
          </button>
          <button
            onClick={() => setActiveFleetTab('combat')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 relative"
            style={{
              background: activeFleetTab === 'combat' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
              color: activeFleetTab === 'combat' ? '#ef4444' : '#64748b',
              border: `1px solid ${activeFleetTab === 'combat' ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
            }}
          >
            <Swords className="w-3.5 h-3.5" />
            Бой
            {combatLog.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold flex items-center justify-center text-white">
                {combatLog.length > 9 ? '9+' : combatLog.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <AnimatePresence mode="wait">
          {/* ═══════ FLEET TAB ═══════ */}
          {activeFleetTab === 'fleet' && (
            <motion.div
              key="fleet"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pb-20"
            >
              {/* Fleet summary */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Кораблей:</span>
                  <span className="text-sm font-bold font-mono neon-text-cyan">
                    {ownedShips.reduce((acc, s) => acc + s.quantity, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Эскадр:</span>
                  <span className="text-sm font-bold font-mono neon-text-purple">{squadrons.length}</span>
                </div>
              </div>

              {/* Ships section */}
              <section>
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShipIcon className="w-3.5 h-3.5 text-neon-cyan" />
                  Ваши корабли
                </h3>
                {ownedShips.length > 0 ? (
                  <div className="space-y-2">
                    {ownedShips.map(ship => {
                      const def = SHIP_DEFS.find(d => d.id === ship.defId);
                      if (!def) return null;
                      return (
                        <ShipCard
                          key={ship.id}
                          ship={ship}
                          def={def}
                          onBuildMore={() => handleBuildShip(def.id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl p-6 text-center neon-border" style={{ background: 'rgba(15, 15, 35, 0.85)' }}>
                    <Rocket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-mono text-muted-foreground">Нет построенных кораблей</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Постройте корабли на станции</p>
                  </div>
                )}

                {/* Build new ship */}
                {availableShipDefs.filter(d => !ownedShips.find(s => s.defId === d.id)).length > 0 && (
                  <details className="mt-2 group">
                    <summary className="flex items-center gap-1.5 text-[10px] font-mono text-neon-cyan cursor-pointer hover:text-cyan-300 transition-colors py-1">
                      <Plus className="w-3 h-3" />
                      Построить новый тип
                    </summary>
                    <div className="mt-1 space-y-1.5">
                      {availableShipDefs
                        .filter(d => !ownedShips.find(s => s.defId === d.id))
                        .map(def => {
                          const Icon = ICON_MAP[def.icon] || Ship;
                          const canAfford = useGameStore.getState().canAfford(def.cost);
                          return (
                            <button
                              key={def.id}
                              onClick={() => handleBuildShip(def.id)}
                              disabled={!canAfford}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left"
                              style={{
                                background: canAfford ? 'rgba(0, 240, 255, 0.05)' : 'rgba(30, 30, 60, 0.3)',
                                border: `1px solid ${canAfford ? 'rgba(0, 240, 255, 0.15)' : 'rgba(100,100,120,0.15)'}`,
                                opacity: canAfford ? 1 : 0.5,
                              }}
                            >
                              <Icon className="w-4 h-4 text-neon-cyan flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-mono text-foreground">{def.name}</span>
                                <div className="flex gap-2 mt-0.5">
                                  <CostRow cost={def.cost} />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </details>
                )}
              </section>

              {/* Squadrons section */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Эскадры
                  </h3>
                  <Button
                    onClick={() => setSquadronDialogOpen(true)}
                    size="sm"
                    className="holo-btn text-[10px] font-mono font-bold px-2.5 py-1 h-6 rounded-lg"
                    style={{
                      background: 'rgba(168, 85, 247, 0.12)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <Plus className="w-3 h-3 mr-0.5" />
                    Создать
                  </Button>
                </div>

                {squadrons.length > 0 ? (
                  <div className="space-y-2">
                    {squadrons.map(sq => (
                      <SquadronCard
                        key={sq.id}
                        squadron={sq}
                        onDelete={() => setNotification('Для удаления эскадры уберите все корабли')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl p-6 text-center neon-border-purple" style={{ background: 'rgba(15, 15, 35, 0.85)' }}>
                    <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-mono text-muted-foreground">Нет эскадр</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Создайте эскадру для боя</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* ═══════ COMBAT TAB ═══════ */}
          {activeFleetTab === 'combat' && (
            <motion.div
              key="combat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pb-20"
            >
              {/* PvP / PvE toggle */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(15, 15, 35, 0.85)' }}>
                <button
                  onClick={() => setCombatMode('pve')}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200"
                  style={{
                    background: combatMode === 'pve' ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                    color: combatMode === 'pve' ? '#ef4444' : '#64748b',
                    border: `1px solid ${combatMode === 'pve' ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                  }}
                >
                  ⚔️ PvE
                </button>
                <button
                  onClick={() => setCombatMode('pvp')}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200"
                  style={{
                    background: combatMode === 'pvp' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                    color: combatMode === 'pvp' ? '#a855f7' : '#64748b',
                    border: `1px solid ${combatMode === 'pvp' ? 'rgba(168, 85, 247, 0.3)' : 'transparent'}`,
                  }}
                >
                  🏴 PvP
                </button>
              </div>

              {/* PvP record */}
              <div className="flex items-center justify-center gap-4 text-[10px] font-mono">
                <span className="text-green-400">🏆 Побед: {pvpWins}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-red-400">💀 Поражений: {pvpLosses}</span>
              </div>

              {/* Targets list */}
              <section>
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-400" />
                  {combatMode === 'pve' ? 'Цели на карте' : 'Противник'}
                </h3>

                {combatMode === 'pve' ? (
                  attackableNodes.length > 0 ? (
                    <div className="space-y-2">
                      {attackableNodes.map(node => (
                        <TargetCard
                          key={node.id}
                          node={node}
                          onSelect={() => setSelectedTarget(node.id === selectedTarget ? null : node.id)}
                          isSelected={selectedTarget === node.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl p-6 text-center neon-border" style={{ background: 'rgba(15, 15, 35, 0.85)' }}>
                      <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs font-mono text-muted-foreground">Нет доступных целей</p>
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Исследуйте карту для обнаружения</p>
                    </div>
                  )
                ) : (
                  /* PvP opponent */
                  pvpOpponent && (
                    <TargetCard
                      key="pvp"
                      node={{
                        id: 'pvp_generated',
                        name: pvpOpponent.name,
                        type: 'pirate',
                        x: 0, y: 0,
                        owner: 'pvp',
                        level: pvpOpponent.level,
                        resources: pvpOpponent.resources,
                        danger: pvpOpponent.danger,
                        discovered: true,
                      }}
                      onSelect={() => setSelectedTarget(selectedTarget === 'pvp_generated' ? null : 'pvp_generated')}
                      isSelected={selectedTarget === 'pvp_generated'}
                    />
                  )
                )}
              </section>

              {/* Squadron selector + attack */}
              {selectedTarget && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-3 neon-border-orange"
                  style={{ background: 'rgba(15, 15, 35, 0.85)' }}
                >
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                    Выберите эскадру
                  </h3>

                  {squadrons.length > 0 ? (
                    <>
                      <div className="space-y-1.5 mb-3">
                        {squadrons.map(sq => {
                          const power = getFleetPower(sq.id);
                          const isSelected = selectedSquadron === sq.id;
                          const hasShips = sq.shipIds.length > 0;
                          return (
                            <button
                              key={sq.id}
                              onClick={() => setSelectedSquadron(isSelected ? null : sq.id)}
                              disabled={!hasShips}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left"
                              style={{
                                background: isSelected ? 'rgba(255, 107, 53, 0.12)' : hasShips ? 'rgba(30, 30, 60, 0.3)' : 'rgba(30, 30, 60, 0.15)',
                                border: `1px solid ${isSelected ? 'rgba(255, 107, 53, 0.3)' : 'rgba(100,100,120,0.15)'}`,
                                opacity: hasShips ? 1 : 0.4,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-[10px] font-mono text-foreground">{sq.name}</span>
                                <span className="text-[9px] font-mono text-muted-foreground">({sq.shipIds.length} кор.)</span>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] font-mono">
                                <span className="text-red-400">⚔{power.attack}</span>
                                <span className="text-blue-400">🛡{power.defense}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        onClick={handleAttack}
                        disabled={!selectedSquadron}
                        className="w-full holo-btn text-xs font-mono font-bold py-3 rounded-xl"
                        style={{
                          background: selectedSquadron ? 'rgba(239, 68, 68, 0.2)' : 'rgba(50, 50, 70, 0.3)',
                          color: selectedSquadron ? '#ef4444' : '#64748b',
                          border: `1px solid ${selectedSquadron ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100,100,120,0.2)'}`,
                          boxShadow: selectedSquadron ? '0 0 30px rgba(239, 68, 68, 0.2)' : 'none',
                        }}
                      >
                        <Swords className="w-4 h-4 mr-1.5" />
                        В бой!
                      </Button>
                    </>
                  ) : (
                    <p className="text-[10px] font-mono text-muted-foreground text-center py-2">
                      Создайте эскадру во вкладке «Флот»
                    </p>
                  )}
                </motion.section>
              )}

              {/* Combat log */}
              <section>
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                  Журнал боя
                </h3>
                {combatLog.length > 0 ? (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {combatLog.slice(0, 10).map(entry => (
                      <CombatLogEntry key={entry.id} entry={entry} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(15, 15, 35, 0.6)', border: '1px solid rgba(100,100,120,0.1)' }}>
                    <p className="text-[10px] font-mono text-muted-foreground/60">Бои ещё не проводились</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Create squadron dialog */}
      <Dialog open={squadronDialogOpen} onOpenChange={setSquadronDialogOpen}>
        <DialogContent
          className="max-w-sm mx-auto"
          style={{
            background: 'rgba(10, 10, 30, 0.97)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.15)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-sm font-mono font-bold neon-text-purple">
              Новая эскадра
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            <input
              type="text"
              value={squadronName}
              onChange={e => setSquadronName(e.target.value)}
              placeholder="Название эскадры..."
              className="w-full px-3 py-2.5 rounded-lg text-xs font-mono bg-transparent text-foreground placeholder:text-muted-foreground/40 outline-none"
              style={{
                border: '1px solid rgba(168, 85, 247, 0.3)',
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.1), inset 0 0 10px rgba(168, 85, 247, 0.05)',
              }}
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && handleCreateSquadron()}
            />
            <Button
              onClick={handleCreateSquadron}
              className="w-full mt-3 holo-btn text-xs font-mono font-bold py-2.5 rounded-lg"
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#a855f7',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Создать эскадру
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Combat animation overlay */}
      <AnimatePresence>
        {showCombatAnimation && combatResult && (
          <CombatAnimation
            key={combatResult.id}
            result={combatResult}
            onComplete={handleCombatAnimationComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

