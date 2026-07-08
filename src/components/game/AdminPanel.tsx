'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { TECH_DEFS, SHIP_DEFS, MODULE_DEFS, ROOM_DEFS, ACHIEVEMENTS, RESOURCE_CONFIG } from '@/lib/game/constants';
import type { Resources } from '@/lib/game/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Shield, Users, Swords, Trophy, Wrench, Zap, Plus, Minus, Search,
  Ban, Trash2, Download, Upload, Copy, Star, Crown, Medal,
  ChevronRight, X, RefreshCw, Eye, Lock, Unlock, Settings,
  TrendingUp, Activity, Award, Gift, Rocket, Flame, Skull,
  ArrowUp, ArrowDown, Hash, UserCircle, ShieldAlert,
} from 'lucide-react';
import { hapticFeedback } from '@/lib/telegram';

// ─── Types ──────────────────────────────────────────────────
interface AdminPlayer {
  id: string;
  telegramUserId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  faction: string | null;
  rating: number;
  level: number;
  stationLevel: number;
  captainName: string;
  pvpWins: number;
  pvpLosses: number;
  energy: number;
  minerals: number;
  crystals: number;
  starShards: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface GlobalStats {
  totalPlayers: number;
  averageRating: number;
  averageLevel: number;
  totalPvpBattles: number;
  totalPvpWins: number;
  totalMineralsMined: number;
  topFactions: Record<string, number>;
}

// ─── Format ──────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Math.floor(n).toLocaleString('ru-RU');
}

// ─── Main Admin Panel ────────────────────────────────────────
export default function AdminPanel() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSecretTap = useCallback(() => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);

    if (newCount >= 5) {
      setIsUnlocked(true);
      setTapCount(0);
      hapticFeedback('success');
      toast.success('🔓 Админ-панель разблокирована!');
    }
  }, [tapCount]);

  if (!isUnlocked) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6" style={{ background: '#0a0a1a' }}>
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Lock className="w-16 h-16 text-muted-foreground/20" />
        </motion.div>
        <p className="text-sm text-muted-foreground/50 mt-4 font-mono">Админ-панель заблокирована</p>
        <button
          onClick={handleSecretTap}
          className="mt-6 px-4 py-2 rounded-lg neon-border holo-btn text-xs font-mono text-muted-foreground/40"
        >
          Нажмите 5 раз для разблокировки
          {tapCount > 0 && <span className="ml-2 text-neon-cyan">{tapCount}/5</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: '#0a0a1a' }}>
      <div className="px-4 py-3 neon-border" style={{ background: 'rgba(15, 15, 35, 0.95)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neon-red" />
            <h2 className="text-sm font-bold text-neon-red uppercase tracking-wider">Админ-панель</h2>
          </div>
          <Badge style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            ADMIN
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col mt-1">
        <div className="px-3">
          <TabsList className="w-full h-9 flex gap-0.5" style={{ background: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(100, 200, 255, 0.1)' }}>
            <AdminTab value="dashboard" icon={Activity} label="Дашборд" />
            <AdminTab value="players" icon={Users} label="Игроки" />
            <AdminTab value="top" icon={Trophy} label="Топ" />
            <AdminTab value="console" icon={Terminal} label="Консоль" />
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full"><div className="p-3 pb-20"><DashboardTab /></div></ScrollArea>
        </TabsContent>
        <TabsContent value="players" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full"><div className="p-3 pb-20"><PlayersTab /></div></ScrollArea>
        </TabsContent>
        <TabsContent value="top" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full"><div className="p-3 pb-20"><TopRewardTab /></div></ScrollArea>
        </TabsContent>
        <TabsContent value="console" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full"><div className="p-3 pb-20"><ConsoleTab /></div></ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Admin Tab Button ────────────────────────────────────────
function AdminTab({ value, icon: Icon, label }: { value: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="flex-1 text-[10px] font-mono data-[state=active]:text-neon-cyan data-[state=active]:bg-cyan-500/10 gap-0.5"
    >
      <Icon className="w-3 h-3" />
      {label}
    </TabsTrigger>
  );
}

// ─── Terminal Icon Fallback ───────────────────────────────────
function Terminal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3"
      style={{ background: `${color}08`, border: `1px solid ${color}25` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD
// ═══════════════════════════════════════════════════════════════
function DashboardTab() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [addResOpen, setAddResOpen] = useState(false);
  const [addRes, setAddRes] = useState<Resources>({ energy: 0, minerals: 0, bioMatter: 0, crystals: 0 });

  useEffect(() => {
    fetch('/api/admin?path=stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  const handleQuickAdd = useCallback(() => {
    const state = useGameStore.getState();
    const newRes = { ...state.resources };
    newRes.energy += addRes.energy;
    newRes.minerals += addRes.minerals;
    newRes.bioMatter += addRes.bioMatter;
    newRes.crystals += addRes.crystals;
    useGameStore.setState({ resources: newRes });
    hapticFeedback('success');
    toast.success(`Ресурсы добавлены! ⚡+${fmt(addRes.energy)} 💎+${fmt(addRes.minerals)}`);
    setAddResOpen(false);
    setAddRes({ energy: 0, minerals: 0, bioMatter: 0, crystals: 0 });
  }, [addRes]);

  return (
    <div className="space-y-3">
      {/* Global Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Users} label="Игроков" value={stats?.totalPlayers ?? '—'} color="#00f0ff" sub="всего зарегистрировано" />
        <StatCard icon={Trophy} label="Средний рейтинг" value={stats?.averageRating ?? '—'} color="#fbbf24" />
        <StatCard icon={Swords} label="PvP битв" value={stats?.totalPvpBattles ?? '—'} color="#ef4444" sub={`побед: ${stats?.totalPvpWins ?? 0}`} />
        <StatCard icon={TrendingUp} label="Добыто минералов" value={fmt(stats?.totalMineralsMined ?? 0)} color="#22c55e" />
      </div>

      {/* Faction Distribution */}
      {stats?.topFactions && Object.keys(stats.topFactions).length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(100, 200, 255, 0.15)' }}>
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Распределение фракций</h3>
          <div className="space-y-1.5">
            {Object.entries(stats.topFactions).map(([faction, count]) => {
              const colors: Record<string, string> = { traders: '#fbbf24', military: '#ef4444', scientists: '#a855f7' };
              const names: Record<string, string> = { traders: 'Торговцы', military: 'Военные', scientists: 'Учёные' };
              const pct = stats.totalPlayers > 0 ? (count / stats.totalPlayers) * 100 : 0;
              const color = colors[faction] || '#00f0ff';
              return (
                <div key={faction} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-16 truncate" style={{ color }}>{names[faction] || faction}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
        <h3 className="text-[10px] font-mono text-neon-yellow uppercase tracking-wider mb-2">⚡ Быстрые действия</h3>
        <div className="grid grid-cols-2 gap-2">
          <QuickAction icon={Zap} label="Добавить ресурсы" color="#fbbf24" onClick={() => setAddResOpen(true)} />
          <QuickAction icon={Trophy} label="Установить рейтинг" color="#00f0ff" onClick={() => { const v = prompt('Рейтинг:'); if (v) { useGameStore.setState({ rating: parseInt(v) }); toast.success(`Рейтинг: ${v}`); } }} />
          <QuickAction icon={ArrowUp} label="Установить уровень" color="#22c55e" onClick={() => { const v = prompt('Уровень:'); if (v) { useGameStore.setState({ level: parseInt(v), stationLevel: parseInt(v) }); toast.success(`Уровень: ${v}`); } }} />
          <QuickAction icon={Star} label="+1000 осколков" color="#a855f7" onClick={() => { useGameStore.setState(s => ({ starShards: s.starShards + 1000 })); toast.success('+1000 осколков'); hapticFeedback('success'); }} />
        </div>
      </div>

      {/* Add Resources Dialog */}
      <Dialog open={addResOpen} onOpenChange={setAddResOpen}>
        <DialogContent style={{ background: 'rgba(10, 10, 30, 0.97)', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
          <DialogHeader>
            <DialogTitle className="neon-text-cyan text-sm">Добавить ресурсы</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <ResInput label="⚡ Энергия" color="#fbbf24" value={addRes.energy} onChange={v => setAddRes(p => ({ ...p, energy: v }))} />
            <ResInput label="💎 Минералы" color="#06b6d4" value={addRes.minerals} onChange={v => setAddRes(p => ({ ...p, minerals: v }))} />
            <ResInput label="🌿 Биоматерия" color="#22c55e" value={addRes.bioMatter} onChange={v => setAddRes(p => ({ ...p, bioMatter: v }))} />
            <ResInput label="🔮 Кристаллы" color="#a855f7" value={addRes.crystals} onChange={v => setAddRes(p => ({ ...p, crystals: v }))} />
          </div>
          <DialogFooter>
            <Button onClick={handleQuickAdd} className="holo-btn w-full" style={{ background: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.4)', color: '#00f0ff' }}>
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-lg p-2.5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] holo-btn" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
    </button>
  );
}

function ResInput({ label, color, value, onChange }: { label: string; color: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-28" style={{ color }}>{label}</span>
      <Input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} className="h-8 font-mono text-xs" style={{ background: 'rgba(15, 15, 35, 0.9)', border: `1px solid ${color}30`, color }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: PLAYERS
// ═══════════════════════════════════════════════════════════════
function PlayersTab() {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await fetch(`/api/admin?${params}`);
      const data = await res.json();
      setPlayers(data.players || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Ошибка загрузки');
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadPlayers(); }, [page, search]); // eslint-disable-line react-hooks/set-state-in-effect

  const handleAdminAction = async (playerId: string, action: string, value?: any) => {
    try {
      const res = await fetch(`/api/admin/player/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value, reason: 'Админ действие' }),
      });
      const data = await res.json();
      toast.success(data.message || 'Выполнено');
      loadPlayers();
    } catch {
      toast.error('Ошибка');
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-8 pl-8 text-xs font-mono"
            style={{ background: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(100, 200, 255, 0.15)' }}
          />
        </div>
        <Button onClick={loadPlayers} size="sm" className="h-8 px-3 holo-btn" style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', color: '#00f0ff' }}>
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className="text-[10px] font-mono text-muted-foreground">
        Найдено: {total} · Страница {page}/{Math.max(1, Math.ceil(total / 20))}
      </div>

      {/* Players List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-xs font-mono">Загрузка...</div>
      ) : players.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs font-mono">Игроки не найдены</div>
      ) : (
        <div className="space-y-1.5">
          {players.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-white/5"
              style={{ background: 'rgba(15, 15, 35, 0.6)', border: '1px solid rgba(100, 200, 255, 0.08)' }}
              onClick={() => setSelectedPlayer(p)}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{
                background: p.isBanned ? 'rgba(239, 68, 68, 0.15)' : p.isAdmin ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 240, 255, 0.1)',
                color: p.isBanned ? '#ef4444' : p.isAdmin ? '#fbbf24' : '#00f0ff',
                border: `1px solid ${p.isBanned ? 'rgba(239, 68, 68, 0.3)' : p.isAdmin ? 'rgba(251, 191, 36, 0.3)' : 'rgba(0, 240, 255, 0.2)'}`,
              }}>
                {p.firstName?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">{p.captainName || p.firstName}</span>
                  {p.isAdmin && <Badge className="text-[7px] h-3 px-1" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'none' }}>ADM</Badge>}
                  {p.isBanned && <Badge className="text-[7px] h-3 px-1" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none' }}>BAN</Badge>}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground">
                  @{p.username || 'N/A'} · ID:{p.telegramUserId}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-bold font-mono neon-text-cyan">{p.rating}</div>
                <div className="text-[9px] font-mono text-muted-foreground">Ур.{p.level}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 text-[10px]">← Назад</Button>
          <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="h-7 text-[10px]">Далее →</Button>
        </div>
      )}

      {/* Player Detail Dialog */}
      {selectedPlayer && (
        <PlayerDetailDialog
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onAction={handleAdminAction}
          onRefresh={loadPlayers}
        />
      )}
    </div>
  );
}

// ─── Player Detail Dialog ────────────────────────────────────
function PlayerDetailDialog({ player, onClose, onAction, onRefresh }: { player: AdminPlayer; onClose: () => void; onAction: (id: string, action: string, value?: any) => void; onRefresh: () => void }) {
  const [addRes, setAddRes] = useState({ energy: 1000, minerals: 1000, bioMatter: 500, crystals: 100 });
  const factionColors: Record<string, string> = { traders: '#fbbf24', military: '#ef4444', scientists: '#a855f7' };

  return (
    <Dialog open={!!player} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto" style={{ background: 'rgba(10, 10, 30, 0.97)', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-neon-cyan" />
            <span className="text-sm neon-text-cyan">{player.captainName || player.firstName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Player Info */}
        <div className="space-y-2 text-xs font-mono">
          <InfoRow label="Telegram ID" value={String(player.telegramUserId)} />
          <InfoRow label="Username" value={`@${player.username || 'N/A'}`} />
          <InfoRow label="Фракция" value={player.faction || '—'} color={factionColors[player.faction || '']} />
          <InfoRow label="Рейтинг" value={String(player.rating)} color="#00f0ff" />
          <InfoRow label="Уровень" value={`${player.level} (станция: ${player.stationLevel})`} />
          <InfoRow label="PvP" value={`${player.pvpWins}W / ${player.pvpLosses}L`} color={player.pvpWins > player.pvpLosses ? '#22c55e' : '#ef4444'} />
          <div className="grid grid-cols-2 gap-1">
            <InfoRow label="Энергия" value={fmt(player.energy)} color="#fbbf24" />
            <InfoRow label="Минералы" value={fmt(player.minerals)} color="#06b6d4" />
            <InfoRow label="Кристаллы" value={fmt(player.crystals)} color="#a855f7" />
            <InfoRow label="Осколки" value={String(player.starShards)} color="#fbbf24" />
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h4 className="text-[10px] font-mono text-neon-red uppercase tracking-wider">Действия администратора</h4>

          {/* Add Resources */}
          <div className="rounded-lg p-2" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
            <span className="text-[10px] font-mono text-neon-green">Накрутить ресурсы:</span>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <ResInput label="⚡" color="#fbbf24" value={addRes.energy} onChange={v => setAddRes(p => ({ ...p, energy: v }))} />
              <ResInput label="💎" color="#06b6d4" value={addRes.minerals} onChange={v => setAddRes(p => ({ ...p, minerals: v }))} />
              <ResInput label="🌿" color="#22c55e" value={addRes.bioMatter} onChange={v => setAddRes(p => ({ ...p, bioMatter: v }))} />
              <ResInput label="🔮" color="#a855f7" value={addRes.crystals} onChange={v => setAddRes(p => ({ ...p, crystals: v }))} />
            </div>
            <Button onClick={() => { onAction(player.id, 'addResources', addRes); }} size="sm" className="w-full mt-1 h-7 text-[10px] holo-btn" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
              Добавить ресурсы
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-1">
            <AdminBtn icon={Trophy} label="Set Рейтинг" color="#00f0ff" onClick={() => { const v = prompt('Новый рейтинг:'); if (v) onAction(player.id, 'setRating', parseInt(v)); }} />
            <AdminBtn icon={ArrowUp} label="Set Уровень" color="#22c55e" onClick={() => { const v = prompt('Новый уровень:'); if (v) onAction(player.id, 'setLevel', parseInt(v)); }} />
            <AdminBtn icon={player.isAdmin ? Shield : ShieldAlert} label={player.isAdmin ? 'Снять админа' : 'Дать админа'} color="#fbbf24" onClick={() => onAction(player.id, 'setAdmin', !player.isAdmin)} />
            <AdminBtn icon={player.isBanned ? Unlock : Ban} label={player.isBanned ? 'Разбанить' : 'Забанить'} color="#ef4444" onClick={() => onAction(player.id, player.isBanned ? 'unban' : 'ban')} />
          </div>

          <Button onClick={() => { onAction(player.id, 'delete'); onClose(); onRefresh(); }} size="sm" className="w-full h-7 text-[10px]" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
            <Trash2 className="w-3 h-3 mr-1" /> Удалить игрока
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span style={color ? { color } : {}} className="font-bold">{value}</span>
    </div>
  );
}

function AdminBtn({ icon: Icon, label, color, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; color: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} size="sm" variant="outline" className="h-7 text-[10px] justify-start gap-1.5 px-2 holo-btn" style={{ background: `${color}08`, border: `1px solid ${color}25`, color }}>
      <Icon className="w-3 h-3" /> {label}
    </Button>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: TOP & REWARDS
// ═══════════════════════════════════════════════════════════════
function TopRewardTab() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard?type=rating&limit=10')
      .then(r => r.json())
      .then(d => setLeaderboard(d.players || []))
      .catch(() => {});
  }, []);

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      const res = await fetch('/api/admin/leaderboard/reward', { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); } else { toast.success(data.message); }
    } catch { toast.error('Ошибка'); }
    setDistributing(false);
  };

  const medalColors = ['#fbbf24', '#94a3b8', '#cd7f32'];

  return (
    <div className="space-y-3">
      {/* Reward Config */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
        <h3 className="text-[10px] font-mono text-neon-yellow uppercase tracking-wider mb-2">🏆 Награды ТОП-3</h3>
        <div className="space-y-1.5">
          {[
            { rank: 1, reward: '💎 5000 кристаллов + ⭐ 1000 осколков', icon: Crown, color: '#fbbf24' },
            { rank: 2, reward: '💎 2000 кристаллов + ⭐ 500 осколков', icon: Medal, color: '#94a3b8' },
            { rank: 3, reward: '💎 1000 кристаллов + ⭐ 200 осколков', icon: Award, color: '#cd7f32' },
          ].map(r => (
            <div key={r.rank} className="flex items-center gap-2">
              <r.icon className="w-4 h-4" style={{ color: r.color }} />
              <span className="text-[10px] font-mono" style={{ color: r.color }}>#{r.rank}</span>
              <span className="text-[10px] text-foreground">{r.reward}</span>
            </div>
          ))}
        </div>
        <Button onClick={handleDistribute} disabled={distributing} className="w-full mt-3 h-8 text-[10px] font-bold holo-btn" style={{ background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.4)', color: '#fbbf24' }}>
          {distributing ? 'Распределение...' : '🎁 Раздать награды ТОП-3'}
        </Button>
      </div>

      {/* Current Top 10 */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
        <h3 className="text-[10px] font-mono text-neon-cyan uppercase tracking-wider mb-2">Текущий ТОП-10</h3>
        {leaderboard.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">Нет данных</p>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: i < 3 ? `${medalColors[i]}08` : 'transparent' }}>
                <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? medalColors[i] : '#64748b' }}>{i + 1}</span>
                <span className="text-[10px] font-mono flex-1 truncate">{p.firstName || p.username}</span>
                <span className="text-[10px] font-bold font-mono neon-text-cyan">{p.rating}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: CONSOLE / CHEATS
// ═══════════════════════════════════════════════════════════════
function ConsoleTab() {
  const handleAction = useCallback((label: string, fn: () => void) => {
    hapticFeedback('success');
    fn();
    toast.success(`${label} ✅`);
  }, []);

  return (
    <div className="space-y-3">
      {/* Direct Resource Set */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
        <h3 className="text-[10px] font-mono text-neon-cyan uppercase tracking-wider mb-2">⚡ Прямое управление ресурсами</h3>
        <DirectResourceControl />
      </div>

      {/* Instant Actions */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
        <h3 className="text-[10px] font-mono text-neon-purple uppercase tracking-wider mb-2">🎯 Мгновенные действия</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <CheatButton label="🔬 Все технологии" color="#a855f7" onClick={() => handleAction('Все технологии исследованы', () => useGameStore.setState({ researchedTechs: TECH_DEFS.map(t => t.id) }))} />
          <CheatButton label="⬆️ Макс уровень модулей" color="#22c55e" onClick={() => handleAction('Модули максимального уровня', () => {
            const modules = useGameStore.getState().modules.map(m => ({ ...m, level: 10, building: false, buildStartTime: null, buildEndTime: null }));
            useGameStore.setState({ modules, stationLevel: 10 });
          })} />
          <CheatButton label="♾️ Бесконечные ресурсы" color="#fbbf24" onClick={() => handleAction('Ресурсы: 999999', () => useGameStore.setState({ resources: { energy: 999999, minerals: 999999, bioMatter: 999999, crystals: 999999 } }))} />
          <CheatButton label="🚀 Все корабли x99" color="#00f0ff" onClick={() => handleAction('99 каждого корабля', () => {
            const ships = SHIP_DEFS.map(d => ({ id: crypto.randomUUID(), defId: d.id, name: d.name, quantity: 99, assignedSquadron: null }));
            useGameStore.setState({ ships });
          })} />
          <CheatButton label="👑 Рейтинг 9999" color="#fbbf24" onClick={() => handleAction('Рейтинг: 9999', () => useGameStore.setState({ rating: 9999 }))} />
          <CheatButton label="🏠 Все комнаты" color="#22c55e" onClick={() => handleAction('Все комнаты разблокированы', () => {
            const allRooms: any[] = ['bridge', 'engineering', 'bioLab', 'hangar', 'bar', 'serverRoom', 'corridor'];
            useGameStore.setState({ unlockedRooms: allRooms });
          })} />
          <CheatButton label="⭐ +10000 осколков" color="#fbbf24" onClick={() => handleAction('+10000 осколков', () => useGameStore.setState(s => ({ starShards: s.starShards + 10000 })))} />
          <CheatButton label="🧪 +50000 науки" color="#a855f7" onClick={() => handleAction('+50000 очков науки', () => useGameStore.setState(s => ({ sciencePoints: s.sciencePoints + 50000 })))} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl p-3" style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <h3 className="text-[10px] font-mono text-neon-red uppercase tracking-wider mb-2">⚠️ Опасная зона</h3>
        <div className="grid grid-cols-2 gap-1.5">
          <CheatButton label="📥 Экспорт состояния" color="#00f0ff" onClick={() => {
            const state = useGameStore.getState();
            navigator.clipboard.writeText(JSON.stringify(state, null, 2));
            toast.success('Состояние скопировано в буфер обмена');
          }} />
          <CheatButton label="📤 Импорт состояния" color="#fbbf24" onClick={() => {
            const json = prompt('Вставьте JSON состояния:');
            if (json) {
              try {
                const state = JSON.parse(json);
                useGameStore.setState(state);
                toast.success('Состояние импортировано!');
              } catch { toast.error('Ошибка парсинга JSON'); }
            }
          }} />
          <CheatButton label="🗑️ СБРОС ПРОГРЕССА" color="#ef4444" onClick={() => {
            if (confirm('Вы уверены? ВСЁ будет удалено!')) {
              localStorage.removeItem('star-dominion-store');
              window.location.reload();
            }
          }} />
        </div>
      </div>
    </div>
  );
}

function DirectResourceControl() {
  const [values, setValues] = useState<Resources>({ energy: 0, minerals: 0, bioMatter: 0, crystals: 0 });

  const setAll = (v: number) => setValues({ energy: v, minerals: v, bioMatter: v, crystals: v });

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[1000, 10000, 50000, 100000].map(v => (
          <button key={v} onClick={() => setAll(v)} className="flex-1 py-1 rounded text-[9px] font-mono holo-btn" style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.2)', color: '#00f0ff' }}>
            {fmt(v)}
          </button>
        ))}
      </div>
      <ResInput label="⚡ Энергия" color="#fbbf24" value={values.energy} onChange={v => setValues(p => ({ ...p, energy: v }))} />
      <ResInput label="💎 Минералы" color="#06b6d4" value={values.minerals} onChange={v => setValues(p => ({ ...p, minerals: v }))} />
      <ResInput label="🌿 Биоматерия" color="#22c55e" value={values.bioMatter} onChange={v => setValues(p => ({ ...p, bioMatter: v }))} />
      <ResInput label="🔮 Кристаллы" color="#a855f7" value={values.crystals} onChange={v => setValues(p => ({ ...p, crystals: v }))} />
      <div className="flex gap-2">
        <Button onClick={() => {
          useGameStore.setState({ resources: { ...values } });
          hapticFeedback('success');
          toast.success('Ресурсы установлены!');
        }} className="flex-1 h-8 text-[10px] holo-btn" style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', color: '#00f0ff' }}>
          Установить
        </Button>
        <Button onClick={() => {
          const cur = useGameStore.getState().resources;
          useGameStore.setState({ resources: { energy: cur.energy + values.energy, minerals: cur.minerals + values.minerals, bioMatter: cur.bioMatter + values.bioMatter, crystals: cur.crystals + values.crystals } });
          hapticFeedback('success');
          toast.success('Ресурсы добавлены!');
        }} className="flex-1 h-8 text-[10px] holo-btn" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e' }}>
          Добавить
        </Button>
      </div>
    </div>
  );
}

function CheatButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg p-2 text-left transition-all hover:scale-[1.02] active:scale-[0.97] holo-btn" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
    </button>
  );
}