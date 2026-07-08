'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/lib/game/store';
import { TECH_DEFS, RESOURCE_CONFIG } from '@/lib/game/constants';
import type { TechBranch, TechDef } from '@/lib/game/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Swords, Settings, Sprout, Brain, ShieldCheck, Bomb, Crown,
  Atom, Wrench, CircleDot, Heart, Bug, Globe, Link, Sparkles, Eye,
  Check, Lock, FlaskConical, Diamond, ChevronRight, X, Zap,
} from 'lucide-react';

// ── Icon map ──────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Swords, Settings, Sprout, Brain, ShieldCheck, Bomb, Crown,
  Atom, Wrench, CircleDot, Heart, Bug, Globe, Link, Sparkles, Eye,
  Zap, Diamond, FlaskConical, Cog: Settings,
};

// ── Branch config ─────────────────────────────────────────
const BRANCH_CONFIG: Record<TechBranch, { label: string; color: string; colorAlpha: string; borderClass: string; glowClass: string }> = {
  military: {
    label: 'Военная',
    color: '#ef4444',
    colorAlpha: 'rgba(239, 68, 68, 0.15)',
    borderClass: 'neon-border-orange',
    glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  },
  engineering: {
    label: 'Инженерия',
    color: '#00f0ff',
    colorAlpha: 'rgba(0, 240, 255, 0.15)',
    borderClass: 'neon-border',
    glowClass: 'shadow-[0_0_20px_rgba(0,240,255,0.3)]',
  },
  biological: {
    label: 'Биология',
    color: '#22c55e',
    colorAlpha: 'rgba(34, 197, 94, 0.15)',
    borderClass: 'neon-border',
    glowClass: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  },
  psycho: {
    label: 'Пси-энергия',
    color: '#a855f7',
    colorAlpha: 'rgba(168, 85, 247, 0.15)',
    borderClass: 'neon-border-purple',
    glowClass: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  },
};

type FilterBranch = TechBranch | 'all';

// ── Format number ─────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Math.floor(n).toLocaleString('ru-RU');
}

// ── Tech status ───────────────────────────────────────────
type TechStatus = 'researched' | 'available' | 'locked';

function getTechStatus(tech: TechDef, researchedTechs: string[], canResearch: (id: string) => boolean): TechStatus {
  if (researchedTechs.includes(tech.id)) return 'researched';
  if (canResearch(tech.id)) return 'available';
  return 'locked';
}

// ── Connection line between tiers ─────────────────────────
function TierConnector({ color, active }: { color: string; active: boolean }) {
  return (
    <div className="flex justify-center py-1">
      <div
        className="w-0.5 h-6 rounded-full transition-all duration-500"
        style={{
          background: active
            ? `linear-gradient(to bottom, ${color}, ${color}88)`
            : 'rgba(100, 100, 120, 0.3)',
          boxShadow: active ? `0 0 6px ${color}44` : 'none',
        }}
      />
    </div>
  );
}

// ── Single tech node ──────────────────────────────────────
function TechNode({
  tech,
  status,
  branchColor,
  onClick,
  isExpanded,
}: {
  tech: TechDef;
  status: TechStatus;
  branchColor: string;
  onClick: () => void;
  isExpanded: boolean;
}) {
  const Icon = ICON_MAP[tech.icon] || FlaskConical;
  const isResearched = status === 'researched';
  const isAvailable = status === 'available';
  const isLocked = status === 'locked';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: tech.tier * 0.05 }}
      className="relative"
    >
      <button
        onClick={onClick}
        disabled={isLocked}
        className={`
          relative w-full text-left rounded-xl p-3 transition-all duration-300
          ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
        `}
        style={{
          background: isResearched
            ? `linear-gradient(135deg, ${branchColor}15, ${branchColor}05)`
            : 'rgba(15, 15, 35, 0.85)',
          border: `1px solid ${
            isResearched
              ? branchColor + '60'
              : isAvailable
                ? branchColor + '40'
                : 'rgba(100, 100, 120, 0.2)'
          }`,
          boxShadow: isAvailable
            ? `0 0 20px ${branchColor}20, inset 0 0 20px ${branchColor}08`
            : isResearched
              ? `0 0 15px ${branchColor}15`
              : 'none',
        }}
      >
        {/* Pulsing ring for available techs */}
        {isAvailable && (
          <div
            className="absolute -inset-[1px] rounded-xl pointer-events-none"
            style={{
              animation: 'glow-pulse 2s ease-in-out infinite',
              boxShadow: `0 0 12px ${branchColor}40, inset 0 0 12px ${branchColor}10`,
            }}
          />
        )}

        <div className="flex items-start gap-2.5 relative z-10">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: isResearched
                ? `${branchColor}25`
                : isAvailable
                  ? `${branchColor}15`
                  : 'rgba(50, 50, 70, 0.4)',
              border: `1px solid ${isResearched ? branchColor + '50' : isAvailable ? branchColor + '30' : 'rgba(100, 100, 120, 0.2)'}`,
            }}
          >
            {isResearched ? (
              <Check className="w-4 h-4" style={{ color: branchColor }} />
            ) : isLocked ? (
              <Lock className="w-4 h-4 text-gray-500" />
            ) : (
              <Icon className="w-4 h-4" style={{ color: branchColor }} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-xs font-bold font-mono truncate"
                style={{ color: isResearched ? branchColor : isAvailable ? '#e2e8f0' : '#64748b' }}
              >
                {tech.name}
              </span>
              <span
                className="flex-shrink-0 text-[8px] font-mono px-1 py-px rounded"
                style={{
                  background: `${branchColor}20`,
                  color: branchColor,
                  border: `1px solid ${branchColor}30`,
                }}
              >
                Ур.{tech.tier}
              </span>
            </div>

            {/* Cost */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <FlaskConical className="w-3 h-3" style={{ color: branchColor }} />
                {fmt(tech.cost)}
              </span>
              {tech.crystalCost > 0 && (
                <span className="flex items-center gap-0.5">
                  <Diamond className="w-3 h-3 text-purple-400" />
                  {tech.crystalCost}
                </span>
              )}
            </div>

            {/* Prerequisites */}
            {tech.prerequisites.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tech.prerequisites.map(pId => {
                  const pDef = TECH_DEFS.find(t => t.id === pId);
                  return pDef ? (
                    <span
                      key={pId}
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(100, 100, 120, 0.2)',
                        border: '1px solid rgba(100, 100, 120, 0.3)',
                        color: '#94a3b8',
                      }}
                    >
                      {pDef.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Expand indicator */}
          {!isLocked && (
            <ChevronRight
              className={`w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </div>
      </button>
    </motion.div>
  );
}

// ── Detail panel ──────────────────────────────────────────
function TechDetailPanel({
  tech,
  status,
  branchColor,
  branchLabel,
  onClose,
  onResearch,
  canAffordSci,
  canAffordCrys,
  sciencePoints,
  crystals,
}: {
  tech: TechDef;
  status: TechStatus;
  branchColor: string;
  branchLabel: string;
  onClose: () => void;
  onResearch: () => void;
  canAffordSci: boolean;
  canAffordCrys: boolean;
  sciencePoints: number;
  crystals: number;
}) {
  const Icon = ICON_MAP[tech.icon] || FlaskConical;
  const isResearched = status === 'researched';
  const canDo = status === 'available' && canAffordSci && canAffordCrys;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
      className="fixed inset-x-0 bottom-16 z-40 px-3"
    >
      <div
        className="rounded-2xl p-4 max-w-lg mx-auto"
        style={{
          background: 'rgba(10, 10, 30, 0.97)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${branchColor}40`,
          boxShadow: `0 0 30px ${branchColor}15, 0 -10px 40px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: `${branchColor}20`,
                border: `1px solid ${branchColor}40`,
              }}
            >
              <Icon className="w-6 h-6" style={{ color: branchColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-mono" style={{ color: branchColor }}>
                  {tech.name}
                </h3>
                {isResearched && (
                  <Badge
                    className="text-[9px] font-mono px-1.5"
                    style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}
                  >
                    ✓ Готово
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono" style={{ color: branchColor }}>{branchLabel}</span>
                <span className="text-[10px] text-muted-foreground">· Уровень {tech.tier}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {tech.description}
        </p>

        {/* Unlocks */}
        <div className="rounded-lg p-2.5 mb-3" style={{ background: `${branchColor}08`, border: `1px solid ${branchColor}20` }}>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: branchColor }}>
            Открывает:
          </span>
          <p className="text-xs text-foreground mt-0.5">{tech.unlocks}</p>
        </div>

        {/* Cost display */}
        {!isResearched && (
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" style={{ color: canAffordSci ? branchColor : '#ef4444' }} />
              <span className={`text-xs font-mono ${canAffordSci ? 'text-foreground' : 'text-red-400'}`}>
                {fmt(sciencePoints)} / {fmt(tech.cost)}
              </span>
            </div>
            {tech.crystalCost > 0 && (
              <div className="flex items-center gap-1.5">
                <Diamond className="w-3.5 h-3.5" style={{ color: canAffordCrys ? '#a855f7' : '#ef4444' }} />
                <span className={`text-xs font-mono ${canAffordCrys ? 'text-foreground' : 'text-red-400'}`}>
                  {crystals} / {tech.crystalCost}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Prerequisites */}
        {tech.prerequisites.length > 0 && !isResearched && (
          <div className="mb-3">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Требования:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {tech.prerequisites.map(pId => {
                const pDef = TECH_DEFS.find(t => t.id === pId);
                return pDef ? (
                  <Badge key={pId} variant="outline" className="text-[9px] font-mono px-1.5 py-0" style={{ borderColor: 'rgba(100,200,255,0.2)' }}>
                    {pDef.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Research button */}
        {!isResearched && (
          <Button
            onClick={onResearch}
            disabled={!canDo}
            className="w-full holo-btn font-mono text-xs font-bold py-2.5 rounded-xl"
            style={{
              background: canDo ? `${branchColor}20` : 'rgba(50, 50, 70, 0.3)',
              color: canDo ? branchColor : '#64748b',
              border: `1px solid ${canDo ? branchColor + '50' : 'rgba(100,100,120,0.2)'}`,
              boxShadow: canDo ? `0 0 20px ${branchColor}20` : 'none',
            }}
          >
            {status === 'locked' ? '🔒 Требования не выполнены' : !canAffordSci || !canAffordCrys ? 'Недостаточно ресурсов' : '⚡ Исследовать'}
          </Button>
        )}

        {/* Already researched indicator */}
        {isResearched && (
          <div
            className="w-full py-2.5 rounded-xl text-center text-xs font-mono font-bold"
            style={{ background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }}
          >
            ✅ Технология исследована
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Branch column ─────────────────────────────────────────
function BranchColumn({
  branch,
  techs,
  researchedTechs,
  canResearch,
  selectedTechId,
  onSelectTech,
}: {
  branch: TechBranch;
  techs: TechDef[];
  researchedTechs: string[];
  canResearch: (id: string) => boolean;
  selectedTechId: string | null;
  onSelectTech: (techId: string) => void;
}) {
  const config = BRANCH_CONFIG[branch];
  const sortedTechs = useMemo(() => [...techs].sort((a, b) => a.tier - b.tier), [techs]);

  return (
    <div className="flex-1 min-w-0">
      {/* Branch header */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ background: config.colorAlpha, border: `1px solid ${config.color}30` }}>
          <div className="w-2 h-2 rounded-full" style={{ background: config.color, boxShadow: `0 0 6px ${config.color}` }} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Tech nodes */}
      <div className="space-y-0">
        {sortedTechs.map((tech, idx) => {
          const status = getTechStatus(tech, researchedTechs, canResearch);
          const isExpanded = selectedTechId === tech.id;
          const isResearched = status === 'researched';
          const nextTech = sortedTechs[idx + 1];
          const nextResearched = nextTech ? researchedTechs.includes(nextTech.id) : false;
          const connectorActive = isResearched && nextTech ? true : false;

          return (
            <div key={tech.id}>
              <TechNode
                tech={tech}
                status={status}
                branchColor={config.color}
                onClick={() => onSelectTech(tech.id)}
                isExpanded={isExpanded}
              />
              {idx < sortedTechs.length - 1 && (
                <TierConnector color={config.color} active={connectorActive} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export default function TechTreeView() {
  const [activeBranch, setActiveBranch] = useState<FilterBranch>('all');
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  const researchedTechs = useGameStore(s => s.researchedTechs);
  const sciencePoints = useGameStore(s => s.sciencePoints);
  const scienceRate = useGameStore(s => s.scienceRate);
  const crystals = useGameStore(s => s.resources.crystals);
  const canResearchFn = useGameStore(s => s.canResearch);
  const researchTech = useGameStore(s => s.researchTech);
  const canAfford = useGameStore(s => s.canAfford);
  const setNotification = useGameStore(s => s.setNotification);

  const branches: TechBranch[] = ['military', 'engineering', 'biological', 'psycho'];

  const filteredTechs = useMemo(() => {
    if (activeBranch === 'all') return TECH_DEFS;
    return TECH_DEFS.filter(t => t.branch === activeBranch);
  }, [activeBranch]);

  const groupedTechs = useMemo(() => {
    const groups = new Map<TechBranch, TechDef[]>();
    const displayBranches = activeBranch === 'all' ? branches : [activeBranch as TechBranch];
    for (const b of displayBranches) {
      groups.set(b, TECH_DEFS.filter(t => t.branch === b));
    }
    return groups;
  }, [activeBranch]);

  const selectedTech = useMemo(
    () => (selectedTechId ? TECH_DEFS.find(t => t.id === selectedTechId) : null),
    [selectedTechId],
  );

  const selectedStatus = useMemo(
    () => (selectedTech ? getTechStatus(selectedTech, researchedTechs, canResearchFn) : null),
    [selectedTech, researchedTechs, canResearchFn],
  );

  const handleResearch = () => {
    if (!selectedTech) return;
    const result = researchTech(selectedTech.id);
    setNotification(result.message);
    if (result.success) {
      setTimeout(() => setSelectedTechId(null), 600);
    }
  };

  const handleCloseDetail = () => setSelectedTechId(null);

  return (
    <div className="holo-transition flex-1 min-h-0 flex flex-col pb-2">
      {/* Science points header */}
      <div className="px-3 pt-2 pb-3">
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(15, 15, 35, 0.85)' }}
        >
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-neon-cyan" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Очки науки</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-mono neon-text-cyan">{fmt(sciencePoints)}</span>
            {scienceRate > 0 && (
              <span className="text-[10px] font-mono text-green-400">
                (+{scienceRate.toFixed(1)}/мин)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Branch filter tabs */}
      <div className="px-3 mb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveBranch('all')}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200"
            style={{
              background: activeBranch === 'all' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(30, 30, 60, 0.4)',
              color: activeBranch === 'all' ? '#00f0ff' : '#94a3b8',
              border: `1px solid ${activeBranch === 'all' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(100, 100, 120, 0.2)'}`,
            }}
          >
            Все
          </button>
          {branches.map(b => {
            const cfg = BRANCH_CONFIG[b];
            const isActive = activeBranch === b;
            const count = TECH_DEFS.filter(t => t.branch === b && researchedTechs.includes(t.id)).length;
            const total = TECH_DEFS.filter(t => t.branch === b).length;
            return (
              <button
                key={b}
                onClick={() => setActiveBranch(b)}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200 flex items-center gap-1.5"
                style={{
                  background: isActive ? cfg.colorAlpha : 'rgba(30, 30, 60, 0.4)',
                  color: isActive ? cfg.color : '#94a3b8',
                  border: `1px solid ${isActive ? cfg.color + '40' : 'rgba(100, 100, 120, 0.2)'}`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? cfg.color : '#64748b' }} />
                {cfg.label}
                <span className="opacity-60">{count}/{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tech tree content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-scroll px-3">
        {activeBranch === 'all' ? (
          /* Grid view: all branches side by side */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-24">
            {branches.map(b => (
              <BranchColumn
                key={b}
                branch={b}
                techs={TECH_DEFS.filter(t => t.branch === b)}
                researchedTechs={researchedTechs}
                canResearch={canResearchFn}
                selectedTechId={selectedTechId}
                onSelectTech={setSelectedTechId}
              />
            ))}
          </div>
        ) : (
          /* Single branch view */
          <div className="max-w-sm mx-auto pb-24">
            <BranchColumn
              branch={activeBranch as TechBranch}
              techs={TECH_DEFS.filter(t => t.branch === activeBranch)}
              researchedTechs={researchedTechs}
              canResearch={canResearchFn}
              selectedTechId={selectedTechId}
              onSelectTech={setSelectedTechId}
            />
          </div>
        )}
      </div>

      {/* Detail panel overlay */}
      <AnimatePresence>
        {selectedTech && selectedStatus && (
          <TechDetailPanel
            tech={selectedTech}
            status={selectedStatus}
            branchColor={BRANCH_CONFIG[selectedTech.branch].color}
            branchLabel={BRANCH_CONFIG[selectedTech.branch].label}
            onClose={handleCloseDetail}
            onResearch={handleResearch}
            canAffordSci={sciencePoints >= selectedTech.cost}
            canAffordCrys={crystals >= selectedTech.crystalCost}
            sciencePoints={sciencePoints}
            crystals={crystals}
          />
        )}
      </AnimatePresence>
    </div>
  );
}