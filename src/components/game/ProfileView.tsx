'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { ACHIEVEMENTS, FACTION_CONFIG, RESOURCE_CONFIG } from '@/lib/game/constants';
import { getTelegramUser, hapticFeedback } from '@/lib/telegram';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  User,
  Star,
  Shield,
  Swords,
  FlaskConical,
  Rocket,
  Diamond,
  Zap,
  Pickaxe,
  Leaf,
  Copy,
  Check,
  Trophy,
  Users,
  Calendar,
  Crown,
  Store,
  Microscope,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Referral Types
// ============================================
interface ReferredFriend {
  username: string;
  joinedAt: string;
  status: 'active' | 'inactive';
}

interface ReferralData {
  code: string;
  invitedCount: number;
  friends: ReferredFriend[];
}

// ============================================
// Icon Mapping for Achievements
// ============================================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Hammer: (props) => <Swords {...props} />,
  Pickaxe: (props) => <Pickaxe {...props} />,
  Swords: (props) => <Swords {...props} />,
  FlaskConical: (props) => <FlaskConical {...props} />,
  Gem: (props) => <Diamond {...props} />,
  Star: (props) => <Star {...props} />,
  Search: (props) => <Microscope {...props} />,
  Trophy: (props) => <Trophy {...props} />,
};

// Note: faction icons are rendered inline to avoid dynamic component creation during render

// ============================================
// Profile Header
// ============================================
function ProfileHeader() {
  const captainName = useGameStore(s => s.captainName);
  const setCaptainName = useGameStore(s => s.setCaptainName);
  const faction = useGameStore(s => s.faction);
  const rating = useGameStore(s => s.rating);
  const level = useGameStore(s => s.level);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(captainName);
  const inputRef = useRef<HTMLInputElement>(null);

  const telegramUser = getTelegramUser();
  const factionCfg = faction ? FACTION_CONFIG[faction] : null;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const saveName = useCallback(() => {
    const trimmed = draftName.trim();
    if (trimmed.length > 0 && trimmed.length <= 20) {
      setCaptainName(trimmed);
      hapticFeedback('success');
    }
    setEditing(false);
  }, [draftName, setCaptainName]);

  // Member since — use the earliest localStorage entry timestamp
  const memberSince = '2025.01.15';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 pt-2 pb-4"
    >
      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-3xl neon-border"
        style={{
          background: faction
            ? `linear-gradient(135deg, ${factionCfg!.color}33, ${factionCfg!.color}11)`
            : 'rgba(15, 15, 35, 0.85)',
          boxShadow: faction ? `0 0 20px ${factionCfg!.color}44` : 'none',
        }}
      >
        {faction === 'traders' && <Store className="w-10 h-10" style={{ color: factionCfg!.color }} />}
        {faction === 'military' && <Shield className="w-10 h-10" style={{ color: factionCfg!.color }} />}
        {faction === 'scientists' && <Microscope className="w-10 h-10" style={{ color: factionCfg!.color }} />}
        {!faction && <User className="w-10 h-10" style={{ color: '#00f0ff' }} />}
      </div>

      {/* Name (editable) */}
      {editing ? (
        <div className="flex items-center gap-2 w-full max-w-[200px]">
          <Input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') { setEditing(false); setDraftName(captainName); }
            }}
            maxLength={20}
            className="h-8 text-sm text-center font-mono bg-space-dark border-cyan-500/40 text-cyan-300"
          />
        </div>
      ) : (
        <button
          onClick={() => { setDraftName(captainName); setEditing(true); hapticFeedback('light'); }}
          className="flex items-center gap-1 group"
        >
          <span className="text-lg font-bold neon-text-cyan">{captainName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </button>
      )}

      {/* Faction badge */}
      {faction && factionCfg && (
        <Badge
          className="font-mono text-xs px-3 py-0.5 border"
          style={{
            background: `${factionCfg.color}22`,
            borderColor: `${factionCfg.color}55`,
            color: factionCfg.color,
          }}
        >
          {factionCfg.name}
        </Badge>
      )}

      {/* Rating + Level */}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-neon-yellow" />
          <span className="font-mono text-sm neon-text-yellow">{rating}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-neon-cyan" />
          <span className="font-mono text-sm text-cyan-300">Ур. {level}</span>
        </div>
      </div>

      {/* Member since + Telegram */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>С {memberSince}</span>
        </div>
        {telegramUser?.username && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>@{telegramUser.username}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// Stats Grid
// ============================================
function StatsGrid() {
  const pvpWins = useGameStore(s => s.pvpWins);
  const pvpLosses = useGameStore(s => s.pvpLosses);
  const rating = useGameStore(s => s.rating);
  const stationLevel = useGameStore(s => s.stationLevel);
  const researchedTechs = useGameStore(s => s.researchedTechs);
  const ships = useGameStore(s => s.ships);
  const totalMineralsMined = useGameStore(s => s.totalMineralsMined);

  const totalShips = ships.reduce((sum, s) => sum + s.quantity, 0);

  const stats = [
    { icon: Swords, label: 'PvP Победы', value: pvpWins, sub: `${pvpLosses} пораж.`, color: '#ef4444' },
    { icon: Trophy, label: 'Рейтинг', value: rating, sub: '', color: '#fbbf24' },
    { icon: Shield, label: 'Ур. станции', value: stationLevel, sub: '', color: '#00f0ff' },
    { icon: FlaskConical, label: 'Технологии', value: researchedTechs.length, sub: 'из 16', color: '#a855f7' },
    { icon: Rocket, label: 'Корабли', value: totalShips, sub: 'всего', color: '#22c55e' },
    { icon: Diamond, label: 'Минералы', value: totalMineralsMined, sub: 'всего', color: '#06b6d4' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 gap-2.5"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="p-3 rounded-xl neon-border"
            style={{ background: 'rgba(15, 15, 35, 0.85)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-[11px] text-slate-400">{stat.label}</span>
            </div>
            <div className="font-mono text-xl font-bold" style={{ color: stat.color }}>
              {typeof stat.value === 'number' ? stat.value.toLocaleString('ru-RU') : stat.value}
            </div>
            {stat.sub && <div className="text-[10px] text-slate-600 mt-0.5">{stat.sub}</div>}
          </div>
        );
      })}
    </motion.div>
  );
}

// ============================================
// Referral Section
// ============================================
function ReferralSection() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const telegramUser = getTelegramUser();
    const telegramUserId = telegramUser?.id ?? 123456789;

    fetch(`/api/player/referral?telegramUserId=${telegramUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.code) {
          setReferralData(data);
        } else {
          // Fallback demo data
          setReferralData({
            code: 'SD-A3F8K2',
            invitedCount: 3,
            friends: [
              { username: 'cosmo_pilot', joinedAt: '2025-01-20', status: 'active' },
              { username: 'nebula_hunter', joinedAt: '2025-01-22', status: 'active' },
              { username: 'star_walker', joinedAt: '2025-02-01', status: 'inactive' },
            ],
          });
        }
      })
      .catch(() => {
        // Demo fallback
        setReferralData({
          code: 'SD-A3F8K2',
          invitedCount: 3,
          friends: [
            { username: 'cosmo_pilot', joinedAt: '2025-01-20', status: 'active' },
            { username: 'nebula_hunter', joinedAt: '2025-01-22', status: 'active' },
            { username: 'star_walker', joinedAt: '2025-02-01', status: 'inactive' },
          ],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const copyReferralLink = useCallback(() => {
    if (!referralData) return;
    const link = `https://t.me/StarDominionBot/game?startapp=${referralData.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      hapticFeedback('success');
      toast.success('Ссылка скопирована!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  }, [referralData]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl neon-border animate-pulse"
        style={{ background: 'rgba(15, 15, 35, 0.85)' }}
      >
        <div className="h-4 bg-slate-800 rounded w-32 mb-3" />
        <div className="h-8 bg-slate-800 rounded w-full mb-3" />
        <div className="h-3 bg-slate-800 rounded w-48" />
      </motion.div>
    );
  }

  if (!referralData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-4 rounded-xl neon-border"
      style={{ background: 'rgba(15, 15, 35, 0.85)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-neon-green" />
        <h3 className="text-sm font-bold neon-text-green">Пригласи друга</h3>
      </div>

      {/* Referral code */}
      <div
        className="flex items-center justify-between p-2.5 rounded-lg mb-3"
        style={{ background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.15)' }}
      >
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">Ваш код</div>
          <div className="font-mono text-sm neon-text-cyan">{referralData.code}</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { copyReferralLink(); }}
          className="h-8 px-3 text-xs holo-btn text-cyan-300 hover:text-cyan-200"
        >
          {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-400">Приглашено: <span className="font-mono neon-text-cyan">{referralData.invitedCount}</span> друзей</span>
      </div>

      {/* Reward info */}
      <div
        className="text-[10px] text-slate-500 p-2 rounded-lg mb-3"
        style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.12)' }}
      >
        🎁 Награда за каждого: <span className="text-neon-green">+200 минералов</span>, <span className="text-neon-yellow">+100 энергии</span>, <span className="text-neon-purple">+50 осколков</span>
      </div>

      {/* Referred friends list */}
      {referralData.friends.length > 0 && (
        <div className="space-y-1.5">
          {referralData.friends.map((friend, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: friend.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: friend.status === 'active' ? '#22c55e' : '#ef4444',
                  }}
                >
                  {friend.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-300">@{friend.username}</div>
                  <div className="text-[10px] text-slate-600">{friend.joinedAt}</div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0"
                style={{
                  borderColor: friend.status === 'active' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                  color: friend.status === 'active' ? '#22c55e' : '#ef4444',
                }}
              >
                {friend.status === 'active' ? 'Активен' : 'Неактивен'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// Achievements Showcase
// ============================================
function AchievementsShowcase() {
  const achievements = useGameStore(s => s.achievements);

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-4 rounded-xl neon-border"
      style={{ background: 'rgba(15, 15, 35, 0.85)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-neon-yellow" />
          <h3 className="text-sm font-bold neon-text-yellow">Достижения</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {unlockedCount}/{totalCount}
        </span>
      </div>

      <Progress
        value={totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}
        className="h-1.5 mb-3"
      />

      <div className="grid grid-cols-4 gap-2">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = achievements.includes(ach.id);
          const IconComponent = ICON_MAP[ach.icon];
          return (
            <motion.div
              key={ach.id}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                isUnlocked ? '' : 'opacity-30'
              }`}
              style={{
                background: isUnlocked ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.02)',
                border: isUnlocked ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid rgba(255,255,255,0.05)',
              }}
              title={ach.description}
            >
              {IconComponent ? (
                <IconComponent
                  className="w-5 h-5"
                  style={{ color: isUnlocked ? '#fbbf24' : '#475569' }}
                />
              ) : (
                <Star className="w-5 h-5" style={{ color: isUnlocked ? '#fbbf24' : '#475569' }} />
              )}
              <span className="text-[9px] text-slate-400 text-center leading-tight line-clamp-1">{ach.name}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================
// Resources Summary
// ============================================
function ResourcesSummary() {
  const resources = useGameStore(s => s.resources);
  const resourceRates = useGameStore(s => s.resourceRates);
  const totalMineralsMined = useGameStore(s => s.totalMineralsMined);

  const resourceList: Array<{
    key: 'energy' | 'minerals' | 'bioMatter' | 'crystals';
    name: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    totalMined?: number;
  }> = [
    { key: 'energy', name: 'Энергия', icon: Zap, color: '#fbbf24' },
    { key: 'minerals', name: 'Минералы', icon: Pickaxe, color: '#06b6d4', totalMined: totalMineralsMined },
    { key: 'bioMatter', name: 'Биоматерия', icon: Leaf, color: '#22c55e' },
    { key: 'crystals', name: 'Кристаллы', icon: Diamond, color: '#a855f7' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-4 rounded-xl neon-border"
      style={{ background: 'rgba(15, 15, 35, 0.85)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-neon-cyan" />
        <h3 className="text-sm font-bold neon-text-cyan">Ресурсы</h3>
      </div>

      <div className="space-y-2.5">
        {resourceList.map((res) => {
          const Icon = res.icon;
          const current = resources[res.key];
          const rate = resourceRates[res.key];
          return (
            <div key={res.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${res.color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: res.color }} />
                </div>
                <span className="text-xs text-slate-400">{res.name}</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm" style={{ color: res.color }}>
                  {Math.floor(current).toLocaleString('ru-RU')}
                </div>
                {rate > 0 && (
                  <div className="text-[10px] font-mono text-slate-600">
                    +{rate.toFixed(1)}/мин
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total mined */}
      <div
        className="mt-3 pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-slate-500">Всего добыто минералов</span>
        <span className="font-mono neon-text-cyan">{totalMineralsMined.toLocaleString('ru-RU')}</span>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Profile View
// ============================================
export default function ProfileView() {
  return (
    <ScrollArea className="h-full px-1">
      <div className="p-3 space-y-4 pb-8">
        <ProfileHeader />
        <StatsGrid />
        <ReferralSection />
        <AchievementsShowcase />
        <ResourcesSummary />
      </div>
    </ScrollArea>
  );
}