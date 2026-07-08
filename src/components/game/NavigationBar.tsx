'use client';

import { useGameStore } from '@/lib/game/store';
import type { GameScreen } from '@/lib/game/types';
import {
  Satellite, FlaskConical, Rocket, Map,
  ShoppingBag, Trophy, User, ChevronLeft, ScrollText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS: { id: GameScreen; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'station', icon: Satellite, label: 'Станция' },
  { id: 'fleet', icon: Rocket, label: 'Флот' },
  { id: 'techTree', icon: FlaskConical, label: 'Техно' },
  { id: 'map', icon: Map, label: 'Карта' },
  { id: 'leaderboard', icon: Trophy, label: 'Топ' },
  { id: 'quests', icon: ScrollText, label: 'Квесты' },
  { id: 'profile', icon: User, label: 'Профиль' },
  { id: 'shop', icon: ShoppingBag, label: 'Магазин' },
];

export default function NavigationBar() {
  const currentScreen = useGameStore(s => s.currentScreen);
  const currentRoom = useGameStore(s => s.currentRoom);
  const setScreen = useGameStore(s => s.setScreen);
  const setRoom = useGameStore(s => s.setRoom);
  const notification = useGameStore(s => s.notification);
  const dismissNotification = useGameStore(s => s.dismissNotification);

  const isInRoom = currentScreen === 'room' && currentRoom;

  return (
    <>
      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center px-3 pt-2 safe-top"
          >
            <div
              className="slide-in-down px-4 py-2.5 rounded-xl text-sm font-medium text-center max-w-sm neon-border"
              style={{ background: 'rgba(10, 10, 30, 0.95)', backdropFilter: 'blur(10px)' }}
              onClick={dismissNotification}
            >
              {notification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room back button */}
      {isInRoom && (
        <div className="fixed bottom-24 left-3 z-40">
          <button
            onClick={() => { setRoom(null); setScreen('station'); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono text-cyan-300 neon-border holo-btn active:scale-95 transition-transform"
            style={{ background: 'rgba(10, 10, 30, 0.9)', minHeight: '44px' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
        </div>
      )}

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
        style={{ background: 'linear-gradient(to top, rgba(5, 5, 16, 0.98) 70%, transparent)', paddingTop: '6px' }}
      >
        <nav
          className="flex items-stretch justify-around mx-2 mb-1 rounded-2xl neon-border overflow-hidden"
          style={{ background: 'rgba(10, 10, 26, 0.95)', backdropFilter: 'blur(12px)', minHeight: '52px' }}
        >
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 transition-all duration-200 active:scale-95 ${
                  isActive ? 'opacity-100' : 'opacity-45 hover:opacity-65'
                }`}
                style={{ minHeight: '52px' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-none"
                    style={{ background: 'rgba(0, 240, 255, 0.08)', borderTop: '2px solid rgba(0, 240, 255, 0.6)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className={`w-[18px] h-[18px] relative z-10 flex-shrink-0 ${isActive ? 'text-neon-cyan' : ''}`} />
                <span className={`text-[10px] leading-tight relative z-10 font-medium ${isActive ? 'neon-text-cyan' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}