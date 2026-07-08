'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { SHOP_ITEMS } from '@/lib/game/constants';
import type { ShopItem } from '@/lib/game/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Star,
  Clock,
  TrendingUp,
  FlaskConical,
  PlusSquare,
  Flame,
  Snowflake,
  Sparkles,
  Map,
  Package,
  Zap,
  Gift,
  Swords,
  Radar,
  Shield,
  Info,
  Send,
  Heart,
  Crown,
  Gem,
} from 'lucide-react';
import { toast } from 'sonner';
import { isTelegramWebApp, openStarsInvoice, getTelegramUser, hapticFeedback } from '@/lib/telegram';

// ============================================
// Telegram Stars Donation Tiers
// ============================================
const STARS_DONATION_TIERS = [
  {
    id: 'support',
    name: 'Поддержка',
    stars: 1,
    description: 'Спасибо за поддержку!',
    icon: Heart,
    color: '#22c55e',
  },
  {
    id: 'ally',
    name: 'Союзник',
    stars: 5,
    description: 'Вы получаете 5000 минералов',
    icon: Send,
    color: '#00f0ff',
  },
  {
    id: 'patron',
    name: 'Покровитель',
    stars: 25,
    description: '5000 энергии + 5000 минералов + 100 кристаллов',
    icon: Gem,
    color: '#a855f7',
  },
  {
    id: 'legend',
    name: 'Легенда',
    stars: 100,
    description: 'Премиум на 7 дней + все ресурсы по 10000',
    icon: Crown,
    color: '#fbbf24',
  },
];

// Icon mapping for shop items
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Clock,
  TrendingUp,
  FlaskConical,
  PlusSquare,
  Flame,
  Snowflake,
  Sparkles,
  Map,
  Star,
  Package,
  Zap,
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  boost: { label: 'Бусты', color: '#00f0ff', icon: Zap },
  cosmetic: { label: 'Косметика', color: '#a855f7', icon: Sparkles },
  slot: { label: 'Слоты', color: '#fbbf24', icon: PlusSquare },
  expedition: { label: 'Экспедиции', color: '#22c55e', icon: Map },
  subscription: { label: 'Подписка', color: '#ff6b35', icon: Star },
};

export default function ShopView() {
  const starShards = useGameStore(s => s.starShards);
  const buyShopItem = useGameStore(s => s.buyShopItem);

  const [activeCategory, setActiveCategory] = useState('all');
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  // Listen for successful Stars payment dispatched from page.tsx
  useEffect(() => {
    const handlePayment = (event: Event) => {
      const payload = (event as CustomEvent).detail as string | undefined;
      if (!payload || !payload.includes(':')) return;

      const [itemId] = payload.split(':');
      hapticFeedback('success');

      // Credit resources based on the donation tier
      const state = useGameStore.getState();
      const res = { ...state.resources };

      switch (itemId) {
        case 'support':
          toast.success('🌟 Спасибо за вашу поддержку!');
          break;
        case 'ally':
          res.minerals += 5000;
          useGameStore.setState({ resources: res });
          toast.success('🚀 +5000 минералов получено!');
          break;
        case 'patron':
          res.energy += 5000;
          res.minerals += 5000;
          res.crystals += 100;
          useGameStore.setState({ resources: res });
          toast.success('💎 +5000 энергии, +5000 минералов, +100 кристаллов!');
          break;
        case 'legend':
          res.energy += 10000;
          res.minerals += 10000;
          res.bioMatter += 10000;
          res.crystals += 10000;
          useGameStore.setState({ resources: res });
          toast.success('👑 Легенда! Все ресурсы +10000! Премиум активирован!');
          break;
        default:
          toast.success('✅ Оплата получена!');
      }
    };

    window.addEventListener('telegram-stars-paid', handlePayment);
    return () => window.removeEventListener('telegram-stars-paid', handlePayment);
  }, []);

  const handleBuy = useCallback(
    (item: ShopItem) => {
      const result = buyShopItem(item.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    [buyShopItem]
  );

  const handleStarsDonation = useCallback(async (tierId: string) => {
    const inTelegram = isTelegramWebApp();

    if (!inTelegram) {
      toast.error('Откройте игру через Telegram бота для доната');
      hapticFeedback('error');
      return;
    }

    const user = getTelegramUser();
    if (!user) {
      toast.error('Не удалось получить данные пользователя Telegram');
      hapticFeedback('error');
      return;
    }

    setPurchasingTier(tierId);
    hapticFeedback('light');

    try {
      const res = await fetch('/api/stars/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: tierId, telegramUserId: String(user.id) }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        toast.error(data.error || 'Ошибка создания счёта');
        hapticFeedback('error');
        setPurchasingTier(null);
        return;
      }

      // Open the Stars invoice in Telegram
      openStarsInvoice(data.url, (status) => {
        setPurchasingTier(null);
        if (status === 'paid') {
          // The event listener in page.tsx will handle the actual crediting
          console.log('[ShopView] Stars payment confirmed:', tierId);
        } else if (status === 'cancelled') {
          toast('Оплата отменена');
        } else if (status === 'failed') {
          toast.error('Оплата не удалась');
          hapticFeedback('error');
        }
      });
    } catch {
      toast.error('Сетевая ошибка. Попробуйте снова.');
      hapticFeedback('error');
      setPurchasingTier(null);
    }
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Header with balance */}
      <div className="px-4 py-3 neon-border" style={{ background: 'rgba(15, 15, 35, 0.95)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-neon-yellow" />
            <h2 className="text-sm font-bold text-neon-yellow uppercase tracking-wider">Магазин</h2>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <Star className="w-4 h-4 text-neon-yellow" style={{ filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))' }} />
            <span className="text-sm font-bold font-mono text-neon-yellow">{starShards}</span>
            <span className="text-[10px] font-mono text-amber-400/70">осколков</span>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <ScrollArea className="flex-1 px-4 pb-4">
        {/* ===== Telegram Stars Banner ===== */}
        <TelegramStarsBanner />

        {/* ===== Telegram Stars Donation Section ===== */}
        <TelegramStarsSection
          tiers={STARS_DONATION_TIERS}
          purchasingTier={purchasingTier}
          onDonate={handleStarsDonation}
        />

        {/* ===== Category Tabs ===== */}
        <div className="pt-3 pb-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <CategoryPill
              label="Все"
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              color="#00f0ff"
            />
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <CategoryPill
                key={key}
                label={cfg.label}
                active={activeCategory === key}
                onClick={() => setActiveCategory(key)}
                color={cfg.color}
              />
            ))}
          </div>
        </div>

        {/* Shop Items Grid */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => {
              const Icon = ICON_MAP[item.icon] || Package;
              const catCfg = CATEGORY_CONFIG[item.category];
              const canAfford = starShards >= item.cost;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative rounded-xl p-3 flex flex-col gap-2"
                  style={{
                    background: 'rgba(15, 15, 35, 0.85)',
                    border: `1px solid ${catCfg ? `${catCfg.color}22` : 'rgba(100, 200, 255, 0.1)'}`,
                  }}
                >
                  {/* Category badge */}
                  {catCfg && (
                    <Badge
                      className="absolute top-2 right-2 text-[8px] h-4 px-1.5 font-mono"
                      style={{
                        background: `${catCfg.color}18`,
                        color: catCfg.color,
                        border: `1px solid ${catCfg.color}33`,
                      }}
                    >
                      {catCfg.label}
                    </Badge>
                  )}

                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mt-1"
                    style={{
                      background: catCfg ? `${catCfg.color}15` : 'rgba(0, 240, 255, 0.08)',
                      border: `1px solid ${catCfg ? `${catCfg.color}33` : 'rgba(0, 240, 255, 0.15)'}`,
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: catCfg?.color || '#00f0ff' }}
                    />
                  </div>

                  {/* Name & Description */}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-foreground leading-tight mb-0.5">
                      {item.name}
                    </h4>
                    <p className="text-[10px] font-mono text-muted-foreground leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Price & Buy */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-neon-yellow" />
                      <span className="text-xs font-bold font-mono" style={{ color: canAfford ? '#fbbf24' : '#ef4444' }}>
                        {item.cost}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-[10px] holo-btn"
                      style={{
                        background: canAfford
                          ? catCfg
                            ? `${catCfg.color}20`
                            : 'rgba(0, 240, 255, 0.1)'
                          : 'rgba(100, 100, 130, 0.1)',
                        border: `1px solid ${canAfford ? (catCfg ? `${catCfg.color}55` : 'rgba(0, 240, 255, 0.3)') : 'rgba(100, 100, 130, 0.2)'}`,
                        color: canAfford ? (catCfg?.color || '#00f0ff') : '#4a5568',
                      }}
                      disabled={!canAfford}
                      onClick={() => handleBuy(item)}
                    >
                      Купить
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Free shards section */}
        <div className="mt-2 mb-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(15, 15, 35, 0.85)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-neon-green" />
              <h3 className="text-xs font-bold text-neon-green uppercase tracking-wider">Бесплатные осколки</h3>
            </div>
            <div className="space-y-2.5">
              <FreeShardItem
                icon={<Swords className="w-4 h-4" />}
                iconColor="#ef4444"
                title="Ежедневные задания"
                description="Выполняйте задания и получайте осколки"
              />
              <FreeShardItem
                icon={<Radar className="w-4 h-4" />}
                iconColor="#00f0ff"
                title="Сканер сектора"
                description="+10 осколков за каждое сканирование"
              />
              <FreeShardItem
                icon={<Shield className="w-4 h-4" />}
                iconColor="#ff6b35"
                title="Астероидная оборона"
                description="+200-500 минералов за успешную оборону"
              />
              <FreeShardItem
                icon={<Map className="w-4 h-4" />}
                iconColor="#a855f7"
                title="Разведка сектора"
                description="Открывайте новые узлы на карте"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================
// Telegram Stars Banner
// ============================================
function TelegramStarsBanner() {
  const inTelegram = isTelegramWebApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 rounded-xl px-4 py-2.5 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(0, 240, 255, 0.08) 100%)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
      >
        <Send className="w-4 h-4" style={{ color: '#22c55e' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight">
          💎 Донат через Telegram Stars — безопасно и удобно!
        </p>
        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
          {inTelegram
            ? 'Поддержите развитие игры и получите бонусы'
            : 'Откройте через Telegram бота для оплаты'}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================
// Telegram Stars Donation Section
// ============================================
function TelegramStarsSection({
  tiers,
  purchasingTier,
  onDonate,
}: {
  tiers: typeof STARS_DONATION_TIERS;
  purchasingTier: string | null;
  onDonate: (tierId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-4"
    >
      <div
        className="rounded-xl p-4"
        style={{
          background: 'rgba(15, 15, 35, 0.85)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4" style={{ color: '#22c55e' }} />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#22c55e' }}>
            Telegram Stars — поддержите развитие игры!
          </h3>
        </div>

        <div className="space-y-2">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isPurchasing = purchasingTier === tier.id;

            return (
              <motion.div
                key={tier.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  background: `${tier.color}08`,
                  border: `1px solid ${tier.color}22`,
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${tier.color}15`,
                    border: `1px solid ${tier.color}33`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: tier.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{tier.name}</span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: `${tier.color}18`,
                        color: tier.color,
                        border: `1px solid ${tier.color}33`,
                      }}
                    >
                      ⭐ {tier.stars}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground leading-snug mt-0.5">
                    {tier.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-3 text-[10px] font-bold flex-shrink-0 holo-btn"
                  style={{
                    background: `${tier.color}18`,
                    border: `1px solid ${tier.color}44`,
                    color: tier.color,
                  }}
                  disabled={isPurchasing}
                  onClick={() => onDonate(tier.id)}
                >
                  {isPurchasing ? (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    </span>
                  ) : (
                    '⭐ Донат'
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Category pill component
function CategoryPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-all whitespace-nowrap"
      style={{
        background: active ? `${color}20` : 'rgba(15, 15, 35, 0.8)',
        border: `1px solid ${active ? `${color}55` : 'rgba(100, 200, 255, 0.1)'}`,
        color: active ? color : '#94a3b8',
        boxShadow: active ? `0 0 10px ${color}22` : 'none',
      }}
    >
      {label}
    </button>
  );
}

// Free shard method item
function FreeShardItem({
  icon,
  iconColor,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `${iconColor}15`,
          border: `1px solid ${iconColor}33`,
        }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-foreground block">{title}</span>
        <span className="text-[10px] font-mono text-muted-foreground block">{description}</span>
      </div>
      <Info className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
    </div>
  );
}