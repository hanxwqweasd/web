'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { SHOP_ITEMS } from '@/lib/game/constants';
import type { ShopItem } from '@/lib/game/types';
import { Badge } from '@/components/ui/badge';
import {
  Star, Clock, TrendingUp, FlaskConical, PlusSquare, Flame,
  Snowflake, Sparkles, Map, Package, Zap, Gift, Swords,
  Radar, Shield, Info, Send, Heart, Crown, Gem, ArrowRight,
  MessageCircle, ExternalLink, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { isTelegramWebApp, getTelegramUser, hapticFeedback, onInvoiceClosed, offInvoiceClosed } from '@/lib/telegram';

// ============================================
// Telegram Stars Donation Tiers
// ============================================
const STARS_DONATION_TIERS = [
  {
    id: 'support',
    name: 'Поддержка',
    stars: 1,
    reward: '500⚡ 500🪨 200🧪 10⭐',
    icon: Heart,
    color: '#22c55e',
  },
  {
    id: 'ally',
    name: 'Союзник',
    stars: 5,
    reward: '5000🪨 3000⚡ 1000🧪 100⭐',
    icon: Send,
    color: '#00f0ff',
  },
  {
    id: 'patron',
    name: 'Покровитель',
    stars: 25,
    reward: '5000⚡ 5000🪨 100💎 500⭐',
    icon: Gem,
    color: '#a855f7',
  },
  {
    id: 'legend',
    name: 'Легенда',
    stars: 100,
    reward: '10000 всех + 500💎 2000⭐',
    icon: Crown,
    color: '#fbbf24',
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Clock, TrendingUp, FlaskConical, PlusSquare, Flame, Snowflake,
  Sparkles, Map, Star, Package, Zap,
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  boost: { label: 'Бусты', color: '#00f0ff' },
  cosmetic: { label: 'Косметика', color: '#a855f7' },
  slot: { label: 'Слоты', color: '#fbbf24' },
  expedition: { label: 'Экспедиции', color: '#22c55e' },
  subscription: { label: 'Подписка', color: '#ff6b35' },
};

export default function ShopView() {
  const starShards = useGameStore(s => s.starShards);
  const buyShopItem = useGameStore(s => s.buyShopItem);
  const [activeCategory, setActiveCategory] = useState('all');
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stars' | 'shop'>('stars');
  const [donationStatus, setDonationStatus] = useState<string | null>(null);
  const pendingTierRef = useRef<string | null>(null);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return SHOP_ITEMS;
    return SHOP_ITEMS.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  const handleBuy = useCallback((item: ShopItem) => {
    const result = buyShopItem(item.id);
    if (result.success) {
      toast.success(result.message);
      hapticFeedback('success');
    } else {
      toast.error(result.message);
      hapticFeedback('error');
    }
  }, [buyShopItem]);

  // ---- Claim rewards after payment ----
  const claimRewards = useCallback((itemId: string, tgUserId: string) => {
    toast.info('⏳ Начисляем награду...');
    fetch('/api/stars/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, telegramUserId: tgUserId }),
    })
    .then(r => r.json())
    .then(result => {
      if (result.success) {
        toast.success(`✅ ${result.message}`);
        hapticFeedback('success');
        // Sync resources from DB
        const user = getTelegramUser();
        if (user) {
          fetch(`/api/player?telegramUserId=${user.id}`)
            .then(r => r.json())
            .then(data => {
              if (data.player) {
                const p = data.player;
                useGameStore.setState({
                  resources: { energy: p.energy, minerals: p.minerals, bioMatter: p.bioMatter, crystals: p.crystals },
                  starShards: p.starShards,
                });
              }
            }).catch(() => {});
        }
      } else {
        toast.error(result.error || 'Ошибка начисления');
      }
    })
    .catch(() => toast.error('Сетевая ошибка при начислении'));
  }, []);

  // ---- Handle invoice_closed event (primary payment detection) ----
  const handleInvoiceEvent = useCallback((event: { status: string; payload?: string }) => {
    console.log('[Shop] invoice_closed event:', JSON.stringify(event));
    setPurchasingTier(null);
    setDonationStatus(null);

    if (event.status === 'paid' && event.payload) {
      const [itemId, tgUserId] = event.payload.split(':');
      if (itemId && tgUserId) {
        claimRewards(itemId, tgUserId);
      }
    } else if (event.status === 'cancelled') {
      toast('Оплата отменена');
    } else if (event.status === 'failed') {
      toast.error('Оплата не удалась');
      hapticFeedback('error');
    }
  }, [claimRewards]);

  // Register invoice_closed event listener
  useEffect(() => {
    if (isTelegramWebApp()) {
      onInvoiceClosed(handleInvoiceEvent);
      return () => offInvoiceClosed(handleInvoiceEvent);
    }
  }, [handleInvoiceEvent]);

  // ---- Sync resources from DB (for sendInvoice flow where no event fires) ----
  const syncResourcesFromDb = useCallback(() => {
    const user = getTelegramUser();
    if (!user) return;
    fetch(`/api/player?telegramUserId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.player) {
          const p = data.player;
          useGameStore.setState({
            resources: { energy: p.energy, minerals: p.minerals, bioMatter: p.bioMatter, crystals: p.crystals },
            starShards: p.starShards,
          });
          toast.success('✅ Ресурсы синхронизированы');
          hapticFeedback('success');
        }
      }).catch(() => {});
  }, []);

  // ---- Method 1: createInvoiceLink + openInvoice (native WebApp payment) ----
  const openInvoiceNative = useCallback(async (tierId: string, url: string) => {
    if (!isTelegramWebApp()) return false;

    try {
      const webApp = window.Telegram?.WebApp;
      if (!webApp?.openInvoice) {
        console.log('[Stars] openInvoice not available');
        return false;
      }

      const result = webApp.openInvoice(url);
      console.log('[Stars] openInvoice returned:', result);

      // If openInvoice returns a non-empty string, it might be a fallback URL
      if (result && result.startsWith('http')) {
        console.log('[Stars] openInvoice returned URL, opening externally');
        window.open(result, '_blank');
      }

      // Assume success — invoice_closed event will handle the rest
      setDonationStatus('Ожидание оплаты...');
      return true;
    } catch (err) {
      console.error('[Stars] openInvoice error:', err);
      return false;
    }
  }, []);

  // ---- Method 2: sendInvoice to user's chat (bot sends invoice message) ----
  const sendInvoiceToChat = useCallback(async (tierId: string, telegramUserId: string) => {
    try {
      const res = await fetch('/api/stars/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: tierId, telegramUserId }),
      });
      const data = await res.json() as { success?: boolean; error?: string };

      if (data.success) {
        toast.success('📩 Счёт отправлен в чат с ботом! Откройте чат и оплатите.');
        hapticFeedback('success');
        setDonationStatus('Счёт в чате — оплатите там');
        return true;
      } else {
        console.error('[Stars] sendInvoice failed:', data.error);
        return false;
      }
    } catch (err) {
      console.error('[Stars] sendInvoice error:', err);
      return false;
    }
  }, []);

  // ---- Main donation handler ----
  const handleStarsDonation = useCallback(async (tierId: string) => {
    const user = getTelegramUser();
    const userId = user ? String(user.id) : '0';

    if (!user) {
      toast.error('Ошибка: не удалось получить данные пользователя');
      return;
    }

    setPurchasingTier(tierId);
    setDonationStatus('Создание счёта...');
    hapticFeedback('light');
    pendingTierRef.current = tierId;

    try {
      // Step 1: Create invoice link
      const res = await fetch('/api/stars/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: tierId, telegramUserId: userId }),
      });
      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        const errMsg = data.error || 'Ошибка создания счёта';
        console.error('[Stars] Invoice creation failed:', errMsg);
        toast.error(`❌ ${errMsg}`);
        setPurchasingTier(null);
        setDonationStatus(null);
        return;
      }

      console.log('[Stars] Invoice URL received:', data.url.substring(0, 50) + '...');

      // Step 2a: Try native openInvoice (WebApp method)
      if (isTelegramWebApp()) {
        const nativeOk = await openInvoiceNative(tierId, data.url);
        if (nativeOk) return; // Success — wait for invoice_closed event
        console.log('[Stars] Native openInvoice failed, trying fallback...');
      }

      // Step 2b: Fallback — send invoice to chat via bot
      setDonationStatus('Отправка в чат...');
      const chatOk = await sendInvoiceToChat(tierId, userId);
      if (chatOk) {
        setPurchasingTier(null);
        return;
      }

      // Step 2c: Last resort — open URL directly
      setDonationStatus(null);
      console.log('[Stars] Trying direct URL open...');
      try {
        window.open(data.url, '_blank');
        toast.info('Счёт открыт в новой вкладке. Оплатите и вернитесь.');
        setDonationStatus('Ожидание оплаты (вкладка)');
        // Auto-check after 30s
        setTimeout(() => {
          setPurchasingTier(null);
          setDonationStatus(null);
          syncResourcesFromDb();
        }, 30000);
      } catch {
        toast.error('Не удалось открыть окно оплаты');
        setPurchasingTier(null);
      }
    } catch (err) {
      console.error('[Stars] Unexpected error:', err);
      toast.error('Сетевая ошибка');
      setPurchasingTier(null);
      setDonationStatus(null);
    }
  }, [openInvoiceNative, sendInvoiceToChat, syncResourcesFromDb]);

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2.5 neon-border" style={{ background: 'rgba(15, 15, 35, 0.95)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-neon-yellow" />
            <h2 className="text-sm font-bold text-neon-yellow uppercase tracking-wider">Магазин</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <Star className="w-3.5 h-3.5 text-neon-yellow" />
            <span className="text-xs font-bold font-mono text-neon-yellow">{starShards}</span>
          </div>
        </div>

        {/* Tab switcher: Stars / Shop */}
        <div className="flex mt-2 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setActiveTab('stars')}
            className="flex-1 py-2 text-xs font-bold transition-all"
            style={{
              background: activeTab === 'stars' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              color: activeTab === 'stars' ? '#22c55e' : '#64748b',
              borderBottom: activeTab === 'stars' ? '2px solid #22c55e' : '2px solid transparent',
            }}
          >
            ⭐ Звёзды
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className="flex-1 py-2 text-xs font-bold transition-all"
            style={{
              background: activeTab === 'shop' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
              color: activeTab === 'shop' ? '#fbbf24' : '#64748b',
              borderBottom: activeTab === 'shop' ? '2px solid #fbbf24' : '2px solid transparent',
            }}
          >
            🪙 Осколки
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-scroll">
        <AnimatePresence mode="wait">
          {activeTab === 'stars' ? (
            <motion.div key="stars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3">
              {/* Status banner */}
              {donationStatus && (
                <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                  <Loader2 className="w-4 h-4 flex-shrink-0 text-neon-yellow animate-spin" />
                  <p className="text-[11px] text-neon-yellow leading-snug">{donationStatus}</p>
                </div>
              )}

              {/* Info banner */}
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <Send className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Поддержите игру через Telegram Stars и получите бонусы!
                </p>
              </div>

              {/* Donation tiers */}
              {STARS_DONATION_TIERS.map((tier) => {
                const Icon = tier.icon;
                const isPurchasing = purchasingTier === tier.id;

                return (
                  <motion.button
                    key={tier.id}
                    whileTap={{ scale: 0.98 }}
                    disabled={isPurchasing}
                    onClick={() => handleStarsDonation(tier.id)}
                    className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors active:bg-white/5 disabled:opacity-60"
                    style={{ background: `${tier.color}06`, border: `1px solid ${tier.color}20` }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tier.color}12`, border: `1px solid ${tier.color}25` }}>
                      {isPurchasing ? (
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: tier.color }} />
                      ) : (
                        <Icon className="w-5 h-5" style={{ color: tier.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{tier.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}30` }}>
                          ⭐ {tier.stars}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{tier.reward}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}30` }}>
                        <ArrowRight className="w-4 h-4" style={{ color: tier.color }} />
                      </div>
                    </div>
                  </motion.button>
                );
              })}

              {/* Manual sync button (if user paid but rewards not credited) */}
              <button
                onClick={syncResourcesFromDb}
                className="w-full py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: 'rgba(100, 200, 255, 0.06)',
                  border: '1px solid rgba(100, 200, 255, 0.15)',
                  color: '#64748b',
                }}
              >
                🔄 Оплатил, но не получил? Нажми для синхронизации
              </button>
            </motion.div>
          ) : (
            <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Category pills */}
              <div className="px-3 pt-2 pb-1">
                <div className="flex gap-1.5 overflow-x-auto tabs-scroll pb-1">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-all whitespace-nowrap"
                    style={{
                      background: activeCategory === 'all' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(15, 15, 35, 0.8)',
                      border: `1px solid ${activeCategory === 'all' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(100, 200, 255, 0.1)'}`,
                      color: activeCategory === 'all' ? '#fbbf24' : '#64748b',
                    }}
                  >
                    Все
                  </button>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold transition-all whitespace-nowrap"
                      style={{
                        background: activeCategory === key ? `${cfg.color}20` : 'rgba(15, 15, 35, 0.8)',
                        border: `1px solid ${activeCategory === key ? `${cfg.color}55` : 'rgba(100, 200, 255, 0.1)'}`,
                        color: activeCategory === key ? cfg.color : '#64748b',
                      }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shop items grid */}
              <div className="px-3 pb-4 grid grid-cols-2 gap-2.5">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => {
                    const Icon = ICON_MAP[item.icon] || Package;
                    const catCfg = CATEGORY_CONFIG[item.category];
                    const canAfford = starShards >= item.cost;
                    const color = catCfg?.color || '#00f0ff';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="rounded-xl p-2.5 flex flex-col gap-1.5"
                        style={{ background: 'rgba(15, 15, 35, 0.85)', border: `1px solid ${color}15` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <Badge className="text-[8px] h-4 px-1.5 font-mono" style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
                            {catCfg?.label}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold text-foreground leading-tight truncate">{item.name}</h4>
                          <p className="text-[9px] font-mono text-muted-foreground leading-snug line-clamp-2 mt-0.5">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-neon-yellow" />
                            <span className="text-[11px] font-bold font-mono" style={{ color: canAfford ? '#fbbf24' : '#ef4444' }}>
                              {item.cost}
                            </span>
                          </div>
                          <button
                            disabled={!canAfford}
                            onClick={() => handleBuy(item)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all holo-btn"
                            style={{
                              background: canAfford ? `${color}15` : 'rgba(100, 100, 130, 0.08)',
                              border: `1px solid ${canAfford ? `${color}40` : 'rgba(100, 100, 130, 0.15)'}`,
                              color: canAfford ? color : '#4a5568',
                              minHeight: '32px',
                            }}
                          >
                            Купить
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Free shards section */}
              <div className="mx-3 mb-4 rounded-xl p-3" style={{ background: 'rgba(15, 15, 35, 0.85)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Gift className="w-4 h-4 text-neon-green" />
                  <h3 className="text-[11px] font-bold text-neon-green uppercase tracking-wider">Бесплатные осколки</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: <Swords className="w-3.5 h-3.5" />, color: '#ef4444', title: 'Ежедневные задания', desc: 'Выполняйте и получайте осколки' },
                    { icon: <Radar className="w-3.5 h-3.5" />, color: '#00f0ff', title: 'Сканер сектора', desc: '+10 осколков за сканирование' },
                    { icon: <Shield className="w-3.5 h-3.5" />, color: '#ff6b35', title: 'Оборона станции', desc: '+200-500 минералов' },
                    { icon: <Map className="w-3.5 h-3.5" />, color: '#a855f7', title: 'Разведка карты', desc: 'Открывайте узлы сектора' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-foreground">{item.title}</span>
                        <span className="text-[9px] font-mono text-muted-foreground block">{item.desc}</span>
                      </div>
                      <Info className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}