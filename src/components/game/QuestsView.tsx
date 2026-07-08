'use client';

import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { ACHIEVEMENTS, RESOURCE_CONFIG } from '@/lib/game/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star,
  Trophy,
  CheckCircle2,
  Lock,
  Zap,
  Pickaxe,
  Swords,
  FlaskConical,
  Gem,
  Hammer,
  Search,
  Target,
  RefreshCw,
  Gift,
  Diamond,
} from 'lucide-react';
import { toast } from 'sonner';

// Icon mapping for achievements
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Hammer,
  Pickaxe,
  Swords,
  FlaskConical,
  Gem,
  Star,
  Search,
  Trophy,
  Target,
};

// ============================================
// Daily Quests Tab
// ============================================
function DailyQuestsTab() {
  const dailyQuests = useGameStore(s => s.dailyQuests);
  const claimQuest = useGameStore(s => s.claimQuest);
  const achievements = useGameStore(s => s.achievements);

  const handleClaim = useCallback(
    (questId: string) => {
      const result = claimQuest(questId);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    [claimQuest]
  );

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: 'rgba(251, 191, 36, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.15)',
        }}
      >
        <RefreshCw className="w-4 h-4 text-neon-yellow flex-shrink-0" />
        <span className="text-[10px] font-mono text-amber-300/70">
          Задания обновляются ежедневно в 00:00 МСК
        </span>
      </div>

      {/* Quest cards */}
      {dailyQuests.map((quest, index) => {
        const progressPct = Math.min(100, (quest.progress / quest.target) * 100);
        const isComplete = quest.completed;
        const isClaimed = quest.claimed;

        return (
          <motion.div
            key={quest.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="rounded-xl p-3"
            style={{
              background: isClaimed
                ? 'rgba(15, 15, 35, 0.5)'
                : isComplete
                ? 'rgba(34, 197, 94, 0.06)'
                : 'rgba(15, 15, 35, 0.85)',
              border: isClaimed
                ? '1px solid rgba(100, 100, 130, 0.15)'
                : isComplete
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(0, 240, 255, 0.15)',
            }}
          >
            {/* Quest header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4
                  className="text-xs font-bold leading-tight"
                  style={{
                    color: isClaimed ? '#4a5568' : isComplete ? '#22c55e' : '#e2e8f0',
                  }}
                >
                  {quest.description}
                </h4>
              </div>
              {isClaimed && (
                <Badge
                  variant="outline"
                  className="ml-2 text-[8px] flex-shrink-0"
                  style={{ borderColor: 'rgba(100, 100, 130, 0.3)', color: '#4a5568' }}
                >
                  Получено
                </Badge>
              )}
              {isComplete && !isClaimed && (
                <Badge
                  className="ml-2 text-[8px] flex-shrink-0"
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                >
                  Готово
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {Math.min(quest.progress, quest.target).toLocaleString('ru-RU')} / {quest.target.toLocaleString('ru-RU')}
                </span>
                <span className="text-[10px] font-mono" style={{ color: isComplete ? '#22c55e' : '#00f0ff' }}>
                  {Math.floor(progressPct)}%
                </span>
              </div>
              <Progress
                value={progressPct}
                className="h-1.5"
              />
            </div>

            {/* Rewards */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-neon-yellow" />
                  <span className="text-[10px] font-mono font-bold text-neon-yellow">{quest.reward.shards}</span>
                </div>
                {quest.reward.resources &&
                  Object.entries(quest.reward.resources).map(([key, val]) => {
                    if (!val) return null;
                    const config = RESOURCE_CONFIG[key as keyof typeof RESOURCE_CONFIG];
                    if (!config) return null;
                    return (
                      <div key={key} className="flex items-center gap-0.5">
                        <Diamond className="w-2.5 h-2.5" style={{ color: config.color }} />
                        <span className="text-[10px] font-mono" style={{ color: config.color }}>
                          {val.toLocaleString('ru-RU')}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Claim button */}
              {isComplete && !isClaimed && (
                <Button
                  size="sm"
                  className="h-7 px-3 text-[10px] holo-btn"
                  style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    color: '#22c55e',
                  }}
                  onClick={() => handleClaim(quest.id)}
                >
                  <Gift className="w-3 h-3 mr-1" />
                  Забрать
                </Button>
              )}

              {!isComplete && (
                <span className="text-[10px] font-mono text-muted-foreground/50">В процессе</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// Achievements Tab
// ============================================
function AchievementsTab() {
  const achievements = useGameStore(s => s.achievements);

  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const rarestUnlocked = useMemo(() => {
    // Return the last unlocked achievement (highest index = "rarest")
    for (let i = ACHIEVEMENTS.length - 1; i >= 0; i--) {
      if (achievements.includes(ACHIEVEMENTS[i].id)) {
        return ACHIEVEMENTS[i];
      }
    }
    return null;
  }, [achievements]);

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(15, 15, 35, 0.85)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Достижения</h3>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold neon-text-cyan">{unlockedCount}</span>
              <span className="text-sm font-mono text-muted-foreground">/ {totalCount}</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="rgba(100, 100, 130, 0.15)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(unlockedCount / totalCount) * 97.4} 97.4`}
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))',
                  transition: 'stroke-dasharray 0.6s ease',
                }}
              />
            </svg>
            <span className="absolute text-xs font-bold font-mono text-neon-yellow">
              {Math.floor((unlockedCount / totalCount) * 100)}%
            </span>
          </div>
        </div>

        {rarestUnlocked && (
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.12)',
            }}
          >
            <Trophy className="w-3.5 h-3.5 text-neon-yellow flex-shrink-0" />
            <span className="text-[10px] font-mono text-amber-300/70">
              Последнее: <span className="text-neon-yellow font-bold">{rarestUnlocked.name}</span>
            </span>
          </div>
        )}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((achievement, index) => {
          const isUnlocked = achievements.includes(achievement.id);
          const Icon = ICON_MAP[achievement.icon] || Star;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              className="relative rounded-xl p-3 text-center"
              style={{
                background: isUnlocked
                  ? 'rgba(251, 191, 36, 0.06)'
                  : 'rgba(15, 15, 35, 0.6)',
                border: isUnlocked
                  ? '1px solid rgba(251, 191, 36, 0.25)'
                  : '1px solid rgba(100, 100, 130, 0.12)',
                opacity: isUnlocked ? 1 : 0.6,
              }}
            >
              {/* Unlocked checkmark */}
              {isUnlocked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neon-green flex items-center justify-center" style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)' }}>
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div className="flex justify-center mb-2">
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: isUnlocked
                      ? 'rgba(251, 191, 36, 0.12)'
                      : 'rgba(100, 100, 130, 0.1)',
                    border: isUnlocked
                      ? '1px solid rgba(251, 191, 36, 0.3)'
                      : '1px solid rgba(100, 100, 130, 0.15)',
                  }}
                  animate={
                    isUnlocked
                      ? {
                          boxShadow: [
                            '0 0 8px rgba(251, 191, 36, 0.2)',
                            '0 0 20px rgba(251, 191, 36, 0.4)',
                            '0 0 8px rgba(251, 191, 36, 0.2)',
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isUnlocked ? (
                    <Icon className="w-6 h-6 text-neon-yellow" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </motion.div>
              </div>

              {/* Name */}
              <h4
                className="text-[11px] font-bold leading-tight mb-0.5"
                style={{ color: isUnlocked ? '#fbbf24' : '#4a5568' }}
              >
                {achievement.name}
              </h4>

              {/* Description */}
              <p className="text-[9px] font-mono leading-snug" style={{ color: isUnlocked ? 'rgba(251, 191, 36, 0.6)' : 'rgba(100, 100, 130, 0.5)' }}>
                {achievement.description}
              </p>

              {/* Unlocked date */}
              {isUnlocked && achievement.unlockedAt && (
                <p className="text-[8px] font-mono mt-1" style={{ color: 'rgba(251, 191, 36, 0.4)' }}>
                  {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Main QuestsView Component
// ============================================
export default function QuestsView() {
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 neon-border" style={{ background: 'rgba(15, 15, 35, 0.95)' }}>
        <Trophy className="w-5 h-5 text-neon-yellow" />
        <h2 className="text-sm font-bold text-neon-yellow uppercase tracking-wider">Задания</h2>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="flex-1 flex flex-col mt-2">
        <div className="px-4">
          <TabsList
            className="w-full h-9"
            style={{ background: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(100, 200, 255, 0.1)' }}
          >
            <TabsTrigger
              value="daily"
              className="flex-1 text-xs data-[state=active]:text-neon-yellow data-[state=active]:bg-amber-500/10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Ежедневные
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="flex-1 text-xs data-[state=active]:text-neon-purple data-[state=active]:bg-purple-500/10"
            >
              <Trophy className="w-3.5 h-3.5 mr-1" />
              Достижения
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="daily" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-4 pb-20">
              <DailyQuestsTab />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="achievements" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="p-4 pb-20">
              <AchievementsTab />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

