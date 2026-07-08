'use client';

import { useGameStore } from '@/lib/game/store';
import type { GameScreen } from '@/lib/game/types';
import {
  Satellite, FlaskConical, Rocket, Map,
  ShoppingBag, Trophy, User, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS: { id: GameScreen; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'station', icon: Satellite, label: 'Станция' },
  { id: 'fleet', icon: Rocket, label: 'Флот' },
  { id: 'techTree', icon: FlaskConical, label: 'Техно' },
  { id: 'map', icon: Map, label: 'Карта' },
  { id: 'leaderboard', icon: Trophy, label: 'Топ' },
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
            className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-2"
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
        <div className="fixed bottom-20 left-2 z-40">
          <button
            onClick={() => { setRoom(null); setScreen('station'); }}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-mono text-cyan-300 neon-border holo-btn"
            style={{ background: 'rgba(10, 10, 30, 0.9)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
        </div>
      )}

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-1 pb-1"
        style={{ background: 'linear-gradient(to top, rgba(5, 5, 16, 0.98) 60%, transparent)' }}
      >
        <nav className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto rounded-2xl neon-border"
          style={{ background: 'rgba(10, 10, 26, 0.92)', backdropFilter: 'blur(12px)' }}
        >
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'scale-105' : 'opacity-50 hover:opacity-70'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className={`w-4.5 h-4.5 relative z-10 ${isActive ? 'text-neon-cyan' : ''}`} />
                <span className={`text-[9px] font-mono relative z-10 ${isActive ? 'neon-text-cyan' : 'text-muted-foreground'}`}>
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