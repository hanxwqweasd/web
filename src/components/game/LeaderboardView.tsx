'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { FACTION_CONFIG } from '@/lib/game/constants';
import { getTelegramUser, hapticFeedback } from '@/lib/telegram';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const order = [1, 0, 2]; // Display order: #1 center, #2 left, #3 right

  const rankConfig = [
    { rank: 1, label: '#1', color: '#fbbf24', glow: '0 0 25px rgba(251,191,36,0.4)', reward: '💎5000 кристаллов + ⭐1000 осколков' },
    { rank: 2, label: '#2', color: '#94a3b8', glow: 'none', reward: '💎3000 кристаллов + ⭐500 осколков' },
    { rank: 3, label: '#3', color: '#d97706', glow: 'none', reward: '💎1500 кристаллов + ⭐250 осколков' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end justify-center gap-2 mb-4 pt-2"
    >
      {order.map((idx) => {
        const player = top3[idx];
        const config = rankConfig[idx];
        const isCenter = idx === 0;
        const isMe = playerIsMe(player.telegramUserId);

        return (
          <motion.div
            key={player.rank}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`flex flex-col items-center ${isCenter ? 'pt-0' : 'pt-6'}`}
            style={{ minWidth: isCenter ? '110px' : '95px' }}
          >
            {/* Crown for #1 */}
            {player.rank === 1 && (
              <Crown className="w-5 h-5 mb-1" style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }} />
            )}

            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold font-mono neon-border mb-1.5"
              style={{
                background: isCenter
                  ? `linear-gradient(135deg, ${config.color}33, ${config.color}11)`
                  : 'rgba(15, 15, 35, 0.85)',
                boxShadow: config.glow,
                borderColor: `${config.color}55`,
              }}
            >
              {player.name.charAt(0)}
            </div>

            {/* Name */}
            <div className="text-[11px] font-medium text-center px-1 truncate w-full" style={{ color: config.color }}>
              {player.name}
            </div>

            {/* Value */}
            <div className="font-mono text-xs text-slate-400">{player.value.toLocaleString('ru-RU')}</div>

            {/* Faction + Level */}
            <div className="flex items-center gap-1 mt-1">
              <FactionBadge faction={player.faction} />
              <span className="text-[10px] text-slate-600">Ур.{player.level}</span>
            </div>

            {/* Reward display */}
            <div className="text-[9px] mt-1 text-center font-mono px-1" style={{ color: config.color }}>
              {config.reward}
            </div>

            {/* Challenge button */}
            {!isMe && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-7 text-[10px] px-2 holo-btn text-neon-red hover:text-red-300"
                    onClick={() => hapticFeedback('medium')}
                  >
                    <Swords className="w-3 h-3 mr-1" />
                    Вызвать
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
                      Вызвать <span style={{ color: config.color }}>{player.name}</span> на PvP-битву?
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
            )}

            {isMe && (
              <Badge className="mt-2 text-[9px] px-1.5 py-0 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                Вы
              </Badge>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ============================================
// Rankings List
// ============================================
function RankingsList({
  players,
  playerIsMe,
}: {
  players: LeaderboardPlayer[];
  playerIsMe: (id: number | undefined) => boolean;
}) {
  const restPlayers = players.slice(3);

  if (restPlayers.length === 0) return null;

  return (
    <ScrollArea className="max-h-[360px]">
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
    </ScrollArea>
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
  const initializedRef = useRef(false);

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
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => fetchLeaderboard('rating'));
    }
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 pt-3 pb-2"
      >
        <Trophy className="w-5 h-5 text-neon-yellow" />
        <h2 className="text-base font-bold neon-text-yellow">Таблица лидеров</h2>
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

      {/* Content */}
      <div className="flex-1 overflow-hidden px-3">
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

            {/* Separator */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              <span className="text-[10px] text-slate-600 font-mono">
                Топ {Math.min(players.length, 50)}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            </div>

            {/* Full Rankings */}
            <RankingsList players={players} playerIsMe={playerIsMe} />
          </>
        )}
      </div>

      {/* My Rank Sticky Card */}
      <MyRankCard myRank={myRank} />
    </div>
  );
}