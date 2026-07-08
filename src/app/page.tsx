'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/game/store';
import type { GameScreen } from '@/lib/game/types';
import { initTelegramWebApp, onInvoiceClosed, offInvoiceClosed, getTelegramUser, hapticFeedback } from '@/lib/telegram';
import StarField from '@/components/game/StarField';
import ResourceBar from '@/components/game/ResourceBar';
import NavigationBar from '@/components/game/NavigationBar';
import StationView from '@/components/game/StationView';
import RoomView from '@/components/game/RoomView';
import TechTreeView from '@/components/game/TechTreeView';
import FleetView from '@/components/game/FleetView';
import MapView from '@/components/game/MapView';
import MiniGames from '@/components/game/MiniGames';
import ShopView from '@/components/game/ShopView';
import QuestsView from '@/components/game/QuestsView';
import ProfileView from '@/components/game/ProfileView';
import LeaderboardView from '@/components/game/LeaderboardView';
import AdminPanel from '@/components/game/AdminPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';

function ScreenRenderer({ screen }: { screen: GameScreen }) {
  switch (screen) {
    case 'station':
      return <StationView />;
    case 'room':
      return <RoomView />;
    case 'techTree':
      return <TechTreeView />;
    case 'fleet':
      return <FleetView />;
    case 'combat':
      return <FleetView />;
    case 'map':
      return <MapView />;
    case 'minigames':
      return <MiniGames />;
    case 'shop':
      return <ShopView />;
    case 'quests':
      return <QuestsView />;
    case 'profile':
      return <ProfileView />;
    case 'leaderboard':
      return <LeaderboardView />;
    case 'admin':
      return <AdminPanel />;
    default:
      return <StationView />;
  }
}

function TutorialOverlay() {
  const tutorialStep = useGameStore(s => s.tutorialStep);
  const tutorialCompleted = useGameStore(s => s.tutorialCompleted);
  const advanceTutorial = useGameStore(s => s.advanceTutorial);

  if (tutorialCompleted) return null;

  const steps = [
    {
      title: 'Добро пожаловать, Капитан!',
      text: 'Вы назначены командиром заброшенной станции в секторе Андромеда-7. Ваша миссия — восстановить её и стать доминирующей силой.',
    },
    {
      title: 'Ресурсы',
      text: 'Вверху вы видите четыре ресурса: Энергию, Минералы, Биоматерию и Кристаллы. Они добываются пассивно и могут быть собраны вручную каждые 5 минут.',
    },
    {
      title: 'Модули',
      text: 'Стройте и улучшайте модули станции. Каждый модуль производит ресурсы или даёт бонусы. Нажмите на пустой слот, чтобы начать строительство!',
    },
    {
      title: 'Исследования',
      text: 'Откройте древо технологий, чтобы исследовать новые возможности. Научные очки генерируются лабораториями.',
    },
    {
      title: 'К сектору!',
      text: 'Исследуйте карту, стройте флот, атакуйте пиратов и станьте легендой Андромеды-7!',
    },
  ];

  const step = steps[tutorialStep] || steps[steps.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-sm w-full p-6 rounded-2xl neon-border"
        style={{ background: 'rgba(10, 10, 30, 0.95)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Swords className="w-5 h-5 text-neon-cyan" />
          <h2 className="text-lg font-bold neon-text-cyan">{step.title}</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed mb-4">{step.text}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= tutorialStep ? 'bg-neon-cyan' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <button
            onClick={advanceTutorial}
            className="px-4 py-2 rounded-lg text-sm font-medium text-space-dark bg-neon-cyan holo-btn"
          >
            {tutorialStep < steps.length - 1 ? 'Далее' : 'Начать!'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FactionSelector() {
  const faction = useGameStore(s => s.faction);
  const selectFaction = useGameStore(s => s.selectFaction);

  if (faction) return null;

  const factions = [
    { id: 'traders' as const, name: 'Торговый Союз', desc: '+20% к добыче ресурсов, доступ к торговым маршрутам', color: '#fbbf24', icon: '🏪' },
    { id: 'military' as const, name: 'Военный Орден', desc: '+25% к урону флота, уникальные корабли', color: '#ef4444', icon: '⚔️' },
    { id: 'scientists' as const, name: 'Академия Знаний', desc: '+30% к очкам науки, ускоренные исследования', color: '#a855f7', icon: '🔬' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-sm w-full p-6 rounded-2xl neon-border"
        style={{ background: 'rgba(10, 10, 30, 0.95)' }}
      >
        <h2 className="text-lg font-bold neon-text-cyan mb-1 text-center">Выберите фракцию</h2>
        <p className="text-xs text-slate-400 text-center mb-5">Это определит ваш путь в секторе Андромеда-7</p>
        <div className="flex flex-col gap-3">
          {factions.map(f => (
            <button
              key={f.id}
              onClick={() => selectFaction(f.id)}
              className="text-left p-4 rounded-xl neon-border holo-btn transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(15, 15, 35, 0.8)' }}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{f.icon}</span>
                <span className="font-bold text-sm" style={{ color: f.color }}>{f.name}</span>
              </div>
              <p className="text-xs text-slate-400 pl-11">{f.desc}</p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function GamePage() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const tick = useGameStore(s => s.tick);
  const showCombatResults = useGameStore(s => s.showCombatResults);
  const setNotification = useGameStore(s => s.setNotification);
  const tutorialCompleted = useGameStore(s => s.tutorialCompleted);
  const faction = useGameStore(s => s.faction);
  const modules = useGameStore(s => s.modules);
  const setScreen = useGameStore(s => s.setScreen);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Expose setScreen to window for admin access via console
  useEffect(() => {
    (window as any).setScreen = setScreen;
    (window as any).__setScreen = setScreen;
    console.log('%c[Star Dominion] Admin: setScreen("admin")', 'color: #00f0ff; font-weight: bold');
  }, [setScreen]);

  // Initialize Telegram Web App on mount + register player + handle referrals
  useEffect(() => {
    initTelegramWebApp();

    const user = getTelegramUser();
    if (user) {
      console.log(`[Telegram] User: ${user.first_name} (@${user.username ?? 'N/A'}), ID: ${user.id}`);

      // Check for admin start_param to auto-open admin panel
      const startParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (startParam === 'admin') {
        console.log('[Telegram] Admin start_param detected, opening admin panel');
        useGameStore.getState().setScreen('admin');
      }

      // Register/update player in DB
      fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          languageCode: user.language_code,
        }),
      }).then(res => res.json()).then(data => {
        if (data.isNew && data.player) {
          console.log(`[Player] New player registered: ${data.player.captainName}`);
          // Check if there's a referral code in start_param
          if (startParam && startParam.startsWith('SD-')) {
            fetch('/api/player/referral', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramUserId: user.id, referralCode: startParam }),
            }).then(r => r.json()).then(refData => {
              if (refData.success) {
                setNotification(`🎁 Реферал: ${refData.message}`);
              }
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }

    // Listen for invoice_closed events (Stars payment confirmation)
    const handleInvoiceClosed = (event: { status: string; payload?: string }) => {
      console.log('[Telegram] invoice_closed:', event);
      if (event.status === 'paid') {
        hapticFeedback('success');
        window.dispatchEvent(new CustomEvent('telegram-stars-paid', { detail: event.payload }));
        // Refresh resources from DB after Stars payment
        const tgUser = getTelegramUser();
        if (tgUser) {
          setTimeout(() => {
            fetch(`/api/player?telegramUserId=${tgUser.id}`)
              .then(r => r.json())
              .then(data => {
                if (data.player) {
                  const p = data.player;
                  useGameStore.setState({
                    resources: {
                      energy: p.energy,
                      minerals: p.minerals,
                      bioMatter: p.bioMatter,
                      crystals: p.crystals,
                    },
                    starShards: p.starShards,
                  });
                  setNotification('⭐ Оплата получена! Ресурсы начислены.');
                }
              }).catch(() => {});
          }, 1000);
        }
      } else if (event.status === 'failed') {
        hapticFeedback('error');
      }
    };

    onInvoiceClosed(handleInvoiceClosed);
    return () => {
      offInvoiceClosed(handleInvoiceClosed);
    };
  }, []);

  // Game tick every 2 seconds
  useEffect(() => {
    tickRef.current = setInterval(() => {
      tick();
    }, 2000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [tick]);

  // Auto-save game state to DB every 30 seconds
  useEffect(() => {
    saveRef.current = setInterval(() => {
      const user = getTelegramUser();
      if (!user) return;

      const state = useGameStore.getState();
      const totalShips = state.ships.reduce((sum, s) => sum + s.quantity, 0);

      fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramUserId: user.id,
          username: getTelegramUser()?.username,
          firstName: getTelegramUser()?.first_name,
          faction: state.faction,
          captainName: state.captainName,
          rating: state.rating,
          level: state.level,
          stationLevel: state.stationLevel,
          energy: Math.floor(state.resources.energy),
          minerals: Math.floor(state.resources.minerals),
          bioMatter: Math.floor(state.resources.bioMatter),
          crystals: Math.floor(state.resources.crystals),
          starShards: state.starShards,
          sciencePoints: Math.floor(state.sciencePoints),
          pvpWins: state.pvpWins,
          pvpLosses: state.pvpLosses,
          totalBattlesWon: state.totalBattlesWon,
          totalEnemiesDefeated: state.totalEnemiesDefeated,
          totalMineralsMined: state.totalMineralsMined,
          researchedTechCount: state.researchedTechs.length,
          moduleCount: state.modules.length,
          shipCount: totalShips,
          achievementCount: state.achievements.length,
          gameStateSnapshot: JSON.stringify({
            researchedTechs: state.researchedTechs,
            unlockedRooms: state.unlockedRooms,
            ships: state.ships,
            squadrons: state.squadrons,
            modules: state.modules,
          }),
        }),
      }).catch(() => {});
    }, 30000);

    return () => {
      if (saveRef.current) clearInterval(saveRef.current);
    };
  }, []);

  // Show tutorial after faction selection if not completed
  const showTutorial = tutorialCompleted === false && faction !== null && modules.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-space-dark">
      {/* Star background */}
      <StarField />

      {/* Game content layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Resource bar */}
        <ResourceBar />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full p-2"
            >
              <ScreenRenderer screen={currentScreen} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Navigation */}
      <NavigationBar />

      {/* Overlays */}
      <AnimatePresence>
        {faction === null && <FactionSelector />}
      </AnimatePresence>
      <AnimatePresence>
        {showTutorial && <TutorialOverlay />}
      </AnimatePresence>
    </div>
  );
}