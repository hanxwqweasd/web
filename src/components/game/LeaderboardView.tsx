'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { FACTION_CONFIG } from '@/lib/game/constants';
import { getTelegramUser, hapticFeedback } from '@/lib/telegram';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// ScrollArea replaced with native scroll for mobile compatibility
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Crown,
  Swords,
  Star,
  Shield,
  Users,
  Zap,
  ChevronUp,
  User,
  Store,
  Microscope,
  Target,
  Loader2,
  RefreshCw,
  Calendar,
  Diamond,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================
interface LeaderboardPlayer {
  rank: number;
  name: string;
  value: number;
  faction: 'traders' | 'military' | 'scientists';
  level: number;
  telegramUserId?: number;
}

interface MyRank {
  rank: number;
  total: number;
}

// ============================================
// Faction Badge Mini
// ============================================
function FactionBadge({ faction }: { faction: string }) {
  const cfg = FACTION_CONFIG[faction as keyof typeof FACTION_CONFIG];
  if (!cfg) return null;
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
      style={{ background: `${cfg.color}22`, color: cfg.color }}
      title={cfg.name}
    >
      {cfg.name.charAt(0)}
    </div>
  );
}

// ============================================
// Top 3 Podium
// ============================================
const WEEKLY_REWARDS = [
  { rank: 1, crystals: 5000, shards: 1000, color: '#fbbf24' },
  { rank: 2, crystals: 2000, shards: 500, color: '#94a3b8' },
  { rank: 3, crystals: 1000, shards: 200, color: '#cd7f32' },
];

function Top3Podium({
  players,
  onChallenge,
  playerIsMe,
}: {
  players: LeaderboardPlayer[];
  onChallenge: (player: LeaderboardPlayer) => void;
  playerIsMe: (id: number | undefined) => boolean;
}) {
  if (players.length < 3) return null;

  const top3 = players.slice(0, 3);
  // Display order: 2nd left, 1st center, 3rd right
  const order = [1, 0, 2];
  const podiumHeights = ['h-20', 'h-28', 'h-16']; // 2nd, 1st, 3rd
  const podiumBgs = [
    'linear-gradient(to top, rgba(148,163,184,0.15), rgba(148,163,184,0.03))',
    'linear-gradient(to top, rgba(251,191,36,0.2), rgba(251,191,36,0.04))',
    'linear-gradient(to top, rgba(205,127,50,0.15), rgba(205,127,50,0.03))',
  ];
  const podiumBorders = [
    'border-t-slate-400/40',
    'border-t-amber-400/60',
    'border-t-orange-600/40',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 pt-1"
    >
      {/* Weekly reward banner */}
      <div
        className="flex items-center justify-center gap-1.5 mb-3 py-1.5 rounded-lg mx-auto max-w-[260px]"
        style={{ background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.12)' }}
      >
        <Calendar className="w-3 h-3 text-amber-400" />
        <span className="text-[9px] font-mono text-amber-400/80">Награды за неделю по рейтингу</span>
      </div>

      <div className="flex items-end justify-center gap-1.5">
        {order.map((idx) => {
          const player = top3[idx];
          const reward = WEEKLY_REWARDS[idx];
          const isCenter = idx === 0;
          const isMe = playerIsMe(player.telegramUserId);

          return (
            <motion.div
              key={player.rank}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isCenter ? 0.15 : 0.05, duration: 0.4 }}
              className="flex flex-col items-center flex-1 max-w-[120px]"
            >
              {/* Player info above podium */}
              <div className="flex flex-col items-center mb-2">
                {/* Crown for #1 */}
                {player.rank === 1 && (
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Crown className="w-5 h-5 mb-1" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' }} />
                  </motion.div>
                )}

                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold font-mono mb-1"
                  style={{
                    background: `linear-gradient(135deg, ${reward.color}28, ${reward.color}08)`,
                    border: `2px solid ${reward.color}50`,
                    boxShadow: player.rank === 1 ? `0 0 16px ${reward.color}30` : 'none',
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="text-[10px] font-bold text-center px-0.5 truncate w-full" style={{ color: reward.color }}>
                  {player.name}
                </div>

                {/* Rating value */}
                <div className="font-mono text-[10px] text-slate-400">{player.value.toLocaleString('ru-RU')}</div>

                {/* Level */}
                <div className="flex items-center gap-1 mt-0.5">
                  <FactionBadge faction={player.faction} />
                  <span className="text-[9px] text-slate-600">Ур.{player.level}</span>
                </div>
              </div>

              {/* Podium column */}
              <div
                className={`w-full rounded-t-lg flex flex-col items-center justify-start pt-2 ${podiumHeights[idx]} border-t-2 ${podiumBorders[idx]}`}
                style={{ background: podiumBgs[idx] }}
              >
                {/* Rank number */}
                <span
                  className="text-2xl font-bold font-mono"
                  style={{ color: reward.color, opacity: 0.7 }}
                >
                  {player.rank}
                </span>

                {/* Weekly reward */}
                <div className="mt-auto mb-2 text-center px-1">
                  <div className="flex items-center justify-center gap-0.5">
                    <Diamond className="w-2.5 h-2.5" style={{ color: reward.color }} />
                    <span className="text-[8px] font-mono font-bold" style={{ color: reward.color }}>
                      {reward.crystals.toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <Star className="w-2.5 h-2.5" style={{ color: reward.color }} />
                    <span className="text-[8px] font-mono font-bold" style={{ color: reward.color }}>
                      {reward.shards.toLocaleString('ru-RU')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons below podium */}
              <div className="mt-2 h-7 flex items-center">
                {!isMe ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[9px] px-2 holo-btn text-neon-red hover:text-red-300"
                        onClick={() => hapticFeedback('medium')}
                      >
                        <Swords className="w-2.5 h-2.5 mr-0.5" />
                        Бой
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent
                      className="max-w-xs neon-border"
                      style={{ background: 'rgba(10, 10, 30, 0.97)' }}
                    >
                      <AlertDialogHeader>
                        <AlertDialogTitle className="neon-text-cyan text-base">
                          ⚔️ Вызов на бой
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400 text-sm">
                          Вызвать <span style={{ color: reward.color }}>{player.name}</span> на PvP-битву?
                          <br />
                          <span className="text-[10px] text-slate-600">Победа: +50 рейтинга, поражение: -30</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                        <AlertDialogAction
                          onClick={() => {
                            hapticFeedback('heavy');
                            onChallenge(player);
                            toast.info('Бой начинается! Перейдите во Флот.');
                          }}
                          className="bg-neon-cyan/20 text-cyan-300 border border-cyan-500/30 hover:bg-neon-cyan/30"
                        >
                          ⚔️ Принять бой
                        </AlertDialogAction>
                        <AlertDialogCancel className="bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800">
                          Отмена
                        </AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Badge className="text-[8px] px-1.5 py-0 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    Вы
                  </Badge>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================
// Rankings List
// ============================================
function RankingsList({
  players,
  startFromIndex,
  playerIsMe,
}: {
  players: LeaderboardPlayer[];
  startFromIndex: number;
  playerIsMe: (id: number | undefined) => boolean;
}) {
  const restPlayers = players.slice(startFromIndex);

  if (restPlayers.length === 0) return null;

  return (
    <div className="space-y-1.5">
        {restPlayers.map((player, i) => {
          const isMe = playerIsMe(player.telegramUserId);
          return (
            <motion.div
              key={player.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                isMe ? 'neon-border' : ''
              }`}
              style={{
                background: isMe ? 'rgba(0, 240, 255, 0.08)' : 'rgba(15, 15, 35, 0.6)',
              }}
            >
              {/* Rank */}
              <div className="w-7 text-center">
                <span className={`font-mono text-sm ${isMe ? 'neon-text-cyan font-bold' : 'text-slate-500'}`}>
                  {player.rank}
                </span>
              </div>

              {/* Avatar mini */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                style={{
                  background: 'rgba(15, 15, 35, 0.85)',
                  border: isMe ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {player.name.charAt(0)}
              </div>

              {/* Name + faction */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isMe ? 'neon-text-cyan' : 'text-slate-300'}`}>
                  {player.name}
                  {isMe && <span className="ml-1 text-[9px] text-cyan-600">(Вы)</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <FactionBadge faction={player.faction} />
                  <span className="text-[10px] text-slate-600">Ур.{player.level}</span>
                </div>
              </div>

              {/* Value */}
              <div className="text-right">
                <span className={`font-mono text-sm ${isMe ? 'neon-text-cyan' : 'text-slate-400'}`}>
                  {player.value.toLocaleString('ru-RU')}
                </span>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}

// ============================================
// My Rank Sticky Card
// ============================================
function MyRankCard({ myRank }: { myRank: MyRank | null }) {
  if (!myRank) return null;

  const isInTop3 = myRank.rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mt-3 mb-16 p-3 rounded-xl neon-border flex items-center justify-between"
      style={{
        background: isInTop3
          ? 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.03))'
          : 'rgba(15, 15, 35, 0.92)',
      }}
    >
      <div className="flex items-center gap-2">
        {isInTop3 ? (
          <Crown className="w-4 h-4 text-neon-yellow" />
        ) : (
          <ChevronUp className="w-4 h-4 text-neon-cyan" />
        )}
        <span className="text-xs text-slate-400">Ваш рейтинг:</span>
      </div>
      <div className="font-mono text-sm">
        <span className={isInTop3 ? 'neon-text-yellow' : 'neon-text-cyan'}>#{myRank.rank}</span>
        <span className="text-slate-600 text-xs ml-1">из {myRank.total}</span>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Leaderboard View — ONLY REAL PLAYERS
// ============================================
export default function LeaderboardView() {
  const [activeTab, setActiveTab] = useState('rating');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const faction = useGameStore(s => s.faction);
  const setScreen = useGameStore(s => s.setScreen);

  const fetchLeaderboard = useCallback((type: string) => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?type=${type}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.players)) {
          setPlayers(data.players);
        } else {
          setPlayers([]);
        }
      })
      .catch(() => {
        setError('Ошибка загрузки');
        setPlayers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchMyRank = useCallback((type: string) => {
    const telegramUser = getTelegramUser();
    if (!telegramUser) {
      // Not in Telegram — try to find our rank from the list
      const myEntry = players.find(p => {
        return false; // We don't have a telegramUserId in non-Telegram mode
      });
      if (myEntry) {
        setMyRank({ rank: myEntry.rank, total: players.length });
      }
      return;
    }

    fetch(`/api/leaderboard/me?telegramUserId=${telegramUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rating) {
          const rankData = type === 'rating' ? data.rating
            : type === 'level' ? data.level
            : type === 'pvp' ? data.pvpWins
            : data.battles;
          if (rankData) {
            setMyRank({ rank: rankData.rank, total: rankData.total });
          }
        }
      })
      .catch(() => {});
  }, [players]);

  useEffect(() => {
    // Delay fetch to ensure player registration has completed
    const timer = setTimeout(() => fetchLeaderboard('rating'), 1000);
    return () => clearTimeout(timer);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (players.length > 0) {
      queueMicrotask(() => fetchMyRank(activeTab));
    } else {
      queueMicrotask(() => setMyRank(null));
    }
  }, [players, activeTab, fetchMyRank]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    fetchLeaderboard(tab);
  }, [fetchLeaderboard]);

  const playerIsMe = useCallback((id: number | undefined) => {
    if (!id) return false;
    return id === getTelegramUser()?.id;
  }, []);

  const handleChallenge = useCallback((_player: LeaderboardPlayer) => {
    setScreen('fleet');
  }, [setScreen]);

  const tabConfig = [
    { id: 'rating', label: 'Рейтинг', icon: Trophy },
    { id: 'level', label: 'Уровень', icon: Star },
    { id: 'pvp', label: 'PvP', icon: Swords },
    { id: 'totalBattlesWon', label: 'Битвы', icon: Target },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 pt-3 pb-2"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-yellow" />
            <h2 className="text-base font-bold neon-text-yellow">Таблица лидеров</h2>
          </div>
          <button
            onClick={() => fetchLeaderboard(activeTab)}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neon-yellow ${loading ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>

        {/* Period Tabs */}
        <div className="px-3 mb-2">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full h-8 p-0.5" style={{ background: 'rgba(15, 15, 35, 0.8)', border: '1px solid rgba(100, 200, 255, 0.1)' }}>
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-1 h-7 text-[11px] gap-1 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:shadow-none rounded-md"
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-scroll px-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600">
            <Users className="w-8 h-8 mb-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-600">
            <Users className="w-8 h-8 mb-2" />
            <span className="text-sm mb-1">Пока нет игроков</span>
            <span className="text-xs text-slate-700">Будьте первым в рейтинге!</span>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {players.length >= 3 && (
              <Top3Podium players={players} onChallenge={handleChallenge} playerIsMe={playerIsMe} />
            )}

            {/* Full Rankings — show all players starting after top 3 (or all if <3) */}
            <RankingsList players={players} startFromIndex={players.length >= 3 ? 3 : 0} playerIsMe={playerIsMe} />
          </>
        )}

        {/* My Rank Card at bottom (scrolls with content) */}
        <div className="pt-2 pb-[80px]">
          <MyRankCard myRank={myRank} />
        </div>
      </div>
    </div>
  );
}