'use client';

import { useGameStore } from '@/lib/game/store';
import { RESOURCE_CONFIG } from '@/lib/game/constants';
import type { ResourceType } from '@/lib/game/types';
import { Zap, Pickaxe, Leaf, Diamond, Star } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Zap, Pickaxe, Leaf, Diamond,
};

export default function ResourceBar() {
  const resources = useGameStore(s => s.resources);
  const resourceRates = useGameStore(s => s.resourceRates);
  const starShards = useGameStore(s => s.starShards);
  const rating = useGameStore(s => s.rating);
  const stationLevel = useGameStore(s => s.stationLevel);

  return (
    <div className="relative z-30 px-2 pt-2 pb-1">
      {/* Station info line */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-cyan glow-pulse" />
          <span className="text-[10px] font-mono text-cyan-300/70 uppercase tracking-wider">
            ФОРПОСТ-7 · Ур. {stationLevel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-neon-yellow" />
            <span className="text-[10px] font-mono text-amber-300">{starShards}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground">Рейтинг</span>
            <span className="text-[10px] font-mono neon-text-cyan">{rating}</span>
          </div>
        </div>
      </div>

      {/* Resource pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(RESOURCE_CONFIG) as ResourceType[]).map(key => {
          const config = RESOURCE_CONFIG[key];
          const Icon = ICON_MAP[config.icon];
          const value = resources[key];
          const rate = resourceRates[key];

          return (
            <div
              key={key}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg neon-border"
              style={{ background: 'rgba(10, 10, 30, 0.9)' }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: config.color }} />
              <div className="flex flex-col leading-none">
                <span className="text-[11px] font-mono font-bold" style={{ color: config.color }}>
                  {typeof value === 'number' ? (value >= 10000 ? `${(value / 1000).toFixed(1)}k` : Math.floor(value).toLocaleString('ru-RU')) : '0'}
                </span>
                {rate !== 0 && (
                  <span className="text-[8px] font-mono" style={{ color: rate > 0 ? config.color : '#ef4444', opacity: 0.7 }}>
                    {rate > 0 ? '+' : ''}{rate.toFixed(1)}/м
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}