'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { SCAN_COOLDOWN } from '@/lib/game/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Radar,
  Crosshair,
  Timer,
  Shield,
  Asterisk,
  RotateCcw,
  Diamond,
  Zap,
  CheckCircle2,
  XCircle,
  Play,
  Skull,
  Heart,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Sector Scanner Mini-Game
// ============================================
function SectorScanner() {
  const lastScanTime = useGameStore(s => s.lastScanTime);
  const completeScan = useGameStore(s => s.completeScan);
  const setNotification = useGameStore(s => s.setNotification);

  const dialRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [targetAngle, setTargetAngle] = useState(Math.random() * 360);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; reward: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check cooldown
  useEffect(() => {
    const checkCooldown = () => {
      const elapsed = Date.now() - lastScanTime;
      if (elapsed < SCAN_COOLDOWN) {
        setIsOnCooldown(true);
        setCooldownRemaining(Math.ceil((SCAN_COOLDOWN - elapsed) / 1000));
      } else {
        setIsOnCooldown(false);
        setCooldownRemaining(0);
      }
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastScanTime]);

  // Radar sweep animation
  useEffect(() => {
    const animate = (time: number) => {
      setSweepAngle((prev) => (prev + 1.5) % 360);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Start a new scan round
  const startNewTarget = useCallback(() => {
    setTargetAngle(Math.random() * 360);
    setLastResult(null);
    setShowResult(false);
    setIsScanning(false);
  }, []);

  // Handle scan tap
  const handleScan = useCallback(() => {
    if (isOnCooldown || isScanning || showResult) return;

    setIsScanning(true);

    // Calculate distance between sweep line and target
    const sweepRad = (sweepAngle * Math.PI) / 180;
    const targetRad = (targetAngle * Math.PI) / 180;
    let diff = Math.abs(sweepRad - targetRad);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const diffDeg = (diff * 180) / Math.PI;

    // Reward: closer to target = more crystals (5-50)
    let reward = 0;
    let success = false;

    if (diffDeg < 15) {
      reward = 50;
      success = true;
    } else if (diffDeg < 30) {
      reward = 35;
      success = true;
    } else if (diffDeg < 50) {
      reward = 20;
      success = true;
    } else if (diffDeg < 75) {
      reward = 10;
      success = true;
    } else if (diffDeg < 100) {
      reward = 5;
      success = true;
    } else {
      reward = 0;
      success = false;
    }

    setTimeout(() => {
      setLastResult({ success, reward });
      setShowResult(true);
      setIsScanning(false);

      if (success && reward > 0) {
        completeScan(reward);
      } else {
        setNotification('Сканирование не зафиксировало сигнал');
      }
    }, 200);
  }, [isOnCooldown, isScanning, showResult, sweepAngle, targetAngle, completeScan, setNotification]);

  // Format cooldown
  const formatCooldown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-2">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-base font-bold neon-text-cyan uppercase tracking-wider">Сканер сектора</h3>
        <p className="text-[10px] font-mono text-muted-foreground mt-1">
          Нажмите, когда линия радара попадёт в цель
        </p>
      </div>

      {/* Radar Dial */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72">
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid rgba(0, 240, 255, 0.2)',
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.03) 0%, rgba(10, 10, 26, 0.9) 70%)',
          }}
        />

        {/* Grid circles */}
        {[33, 66, 100].map(pct => (
          <div
            key={pct}
            className="absolute rounded-full"
            style={{
              width: `${pct}%`,
              height: `${pct}%`,
              top: `${(100 - pct) / 2}%`,
              left: `${(100 - pct) / 2}%`,
              border: '1px solid rgba(0, 240, 255, 0.08)',
            }}
          />
        ))}

        {/* Cross-hairs */}
        <div
          className="absolute top-0 bottom-0 left-1/2 w-px"
          style={{ background: 'rgba(0, 240, 255, 0.08)' }}
        />
        <div
          className="absolute left-0 right-0 top-1/2 h-px"
          style={{ background: 'rgba(0, 240, 255, 0.08)' }}
        />

        {/* Sweep line */}
        <div
          ref={dialRef}
          className="absolute top-1/2 left-1/2 origin-left"
          style={{
            width: '50%',
            height: '2px',
            transform: `rotate(${sweepAngle}deg)`,
            background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.8), rgba(0, 240, 255, 0))',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)',
          }}
        />

        {/* Sweep trail (cone) */}
        <div
          className="absolute top-1/2 left-1/2 origin-left pointer-events-none"
          style={{
            width: '50%',
            transform: `rotate(${sweepAngle}deg)`,
            background: `conic-gradient(from -20deg, transparent, rgba(0, 240, 255, 0.06) 40deg, transparent)`,
            filter: 'blur(4px)',
          }}
        />

        {/* Target zone */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            width: 24,
            height: 24,
            marginTop: -12,
            marginLeft: -12,
            transform: `rotate(${targetAngle}deg) translateY(-${(128 * 0.6)}px)`,
            transformOrigin: '50% 50%',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-6 h-6 rounded-full border-2 border-neon-green bg-neon-green/20 flex items-center justify-center">
            <Crosshair className="w-3 h-3 text-neon-green" />
          </div>
        </motion.div>

        {/* Center point */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-neon-cyan" style={{ boxShadow: '0 0 10px rgba(0, 240, 255, 0.6)' }} />

        {/* Clickable area for scan */}
        <button
          className="absolute inset-0 rounded-full z-10"
          onClick={handleScan}
          disabled={isOnCooldown || showResult}
          style={{ cursor: isOnCooldown || showResult ? 'not-allowed' : 'pointer' }}
        />

        {/* Result overlay */}
        <AnimatePresence>
          {showResult && lastResult && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-full z-20"
              style={{ background: 'rgba(10, 10, 26, 0.85)' }}
            >
              {lastResult.success ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-neon-green mb-2" />
                  <span className="text-lg font-bold neon-text-cyan">+{lastResult.reward}</span>
                  <span className="text-[10px] font-mono text-neon-green mt-1">кристаллов</span>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-neon-red mb-2" />
                  <span className="text-sm font-bold text-neon-red">Промах!</span>
                  <span className="text-[10px] font-mono text-muted-foreground mt-1">Попробуйте ещё раз</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        {showResult && (
          <Button
            size="sm"
            className="w-full holo-btn neon-border text-neon-cyan hover:text-neon-cyan"
            style={{ background: 'rgba(0, 240, 255, 0.1)' }}
            onClick={startNewTarget}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Ещё раз
          </Button>
        )}

        {isOnCooldown && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg neon-border" style={{ background: 'rgba(15, 15, 35, 0.9)' }}>
            <Timer className="w-4 h-4 text-neon-orange" />
            <span className="text-xs font-mono text-neon-orange">
              Перезарядка: {formatCooldown(cooldownRemaining)}
            </span>
          </div>
        )}

        {!isOnCooldown && !showResult && (
          <p className="text-[10px] font-mono text-muted-foreground text-center">
            <Radar className="w-3 h-3 inline mr-1 text-neon-cyan" />
            Нажмите на радар для сканирования
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Asteroid Defense Mini-Game
// ============================================
interface Asteroid {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  rotation: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const ROUND_DURATION = 30;

function AsteroidDefense() {
  const defendAsteroids = useGameStore(s => s.defendAsteroids);

  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const asteroidIdRef = useRef(0);
  const particleIdRef = useRef(0);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [stationHealth, setStationHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [result, setResult] = useState<'won' | 'lost' | null>(null);

  // Game area dimensions
  const [areaHeight, setAreaHeight] = useState(400);

  useEffect(() => {
    if (containerRef.current) {
      setAreaHeight(containerRef.current.clientHeight);
    }
  }, [gameState]);

  // Spawn asteroid
  const spawnAsteroid = useCallback(() => {
    const id = asteroidIdRef.current++;
    const hp = Math.random() < 0.3 ? 3 : Math.random() < 0.5 ? 2 : 1;
    return {
      id,
      x: 10 + Math.random() * 80,
      y: -10,
      hp,
      maxHp: hp,
      speed: 0.3 + Math.random() * 0.4 + (3 - hp) * 0.15,
      size: 18 + hp * 8,
      rotation: Math.random() * 360,
    };
  }, []);

  // Spawn particles on hit
  const spawnHitParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color: Math.random() > 0.5 ? '#fbbf24' : '#ff6b35',
        size: 2 + Math.random() * 3,
      });
    }
    setParticles(prev => [...prev.slice(-50), ...newParticles]);
  }, []);

  // Spawn explosion particles
  const spawnExplosion = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 20,
        maxLife: 45,
        color: ['#ef4444', '#fbbf24', '#ff6b35', '#a855f7'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 4,
      });
    }
    setParticles(prev => [...prev.slice(-60), ...newParticles]);
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setAsteroids([]);
    setParticles([]);
    setStationHealth(100);
    setScore(0);
    setTimeLeft(ROUND_DURATION);
    setResult(null);
    setGameState('playing');
    asteroidIdRef.current = 0;
    particleIdRef.current = 0;
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastTime = performance.now();
    let spawnTimer = 0;
    let timerAccum = 0;
    let frameCount = 0;

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      frameCount++;

      // Update timer
      timerAccum += dt;
      if (timerAccum >= 1) {
        timerAccum -= 1;
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setResult('won');
            setGameState('ended');
            return 0;
          }
          return next;
        });
      }

      // Spawn asteroids
      spawnTimer += dt;
      const spawnInterval = Math.max(0.4, 1.5 - (ROUND_DURATION - timeLeft) * 0.03);
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        setAsteroids(prev => [...prev, spawnAsteroid()]);
      }

      // Update asteroids
      setAsteroids(prev => {
        const updated = prev
          .map(a => ({
            ...a,
            y: a.y + a.speed * dt * 60,
            rotation: a.rotation + a.speed * dt * 30,
          }))
          .filter(a => {
            // Asteroid reached bottom
            if (a.y > 95) {
              setStationHealth(h => {
                const newHealth = h - 10;
                if (newHealth <= 0) {
                  setResult('lost');
                  setGameState('ended');
                }
                return Math.max(0, newHealth);
              });
              return false;
            }
            return true;
          });
        return updated;
      });

      // Update particles
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt * 30,
            y: p.y + p.vy * dt * 30,
            life: p.life - dt * 60,
          }))
          .filter(p => p.life > 0)
      );

      // Check game end
      if (result) return;

      animRef.current = requestAnimationFrame(gameLoop);
    };

    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, timeLeft, result, spawnAsteroid]);

  // Handle asteroid tap
  const handleAsteroidTap = useCallback(
    (asteroid: Asteroid) => {
      if (gameState !== 'playing') return;

      const newHp = asteroid.hp - 1;
      spawnHitParticles(asteroid.x, asteroid.y);

      if (newHp <= 0) {
        // Destroyed
        spawnExplosion(asteroid.x, asteroid.y);
        setAsteroids(prev => prev.filter(a => a.id !== asteroid.id));
        setScore(prev => prev + 1);
      } else {
        setAsteroids(prev =>
          prev.map(a => (a.id === asteroid.id ? { ...a, hp: newHp } : a))
        );
      }
    },
    [gameState, spawnHitParticles, spawnExplosion]
  );

  // End game
  useEffect(() => {
    if (result === 'won') {
      defendAsteroids(true);
      toast.success(`Оборона успешна! Уничтожено: ${score}`);
    } else if (result === 'lost') {
      defendAsteroids(false);
      toast.error('Оборона провалена! Станция повреждена');
    }
  }, [result, score, defendAsteroids]);

  return (
    <div className="flex flex-col items-center gap-3 px-2">
      {/* Title & Stats */}
      <div className="w-full flex items-center justify-between px-2">
        <h3 className="text-base font-bold neon-text-orange uppercase tracking-wider">Астероидная оборона</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
            <span className="text-xs font-mono text-neon-yellow">{score}</span>
          </div>
          <div className="flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-xs font-mono neon-text-cyan">{timeLeft}с</span>
          </div>
        </div>
      </div>

      {/* Station health bar */}
      {gameState === 'playing' && (
        <div className="w-full px-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <Heart className="w-3 h-3 text-neon-red" />
              Станция
            </span>
            <span className="text-[10px] font-mono" style={{ color: stationHealth > 50 ? '#22c55e' : stationHealth > 25 ? '#fbbf24' : '#ef4444' }}>
              {stationHealth}%
            </span>
          </div>
          <Progress
            value={stationHealth}
            className="h-2"
          />
        </div>
      )}

      {/* Game area */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          height: areaHeight || 400,
          background: 'linear-gradient(180deg, rgba(5, 5, 20, 0.95) 0%, rgba(10, 10, 30, 0.98) 100%)',
          border: '1px solid rgba(100, 200, 255, 0.1)',
        }}
      >
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Asterisk className="w-16 h-16 text-neon-orange/30" />
            </motion.div>
            <p className="text-sm text-muted-foreground text-center px-8">
              Уничтожайте астероиды, пока они не достигли станции!
            </p>
            <Button
              className="holo-btn"
              style={{ background: 'rgba(255, 107, 53, 0.15)', border: '1px solid rgba(255, 107, 53, 0.4)', color: '#ff6b35' }}
              onClick={startGame}
            >
              <Play className="w-4 h-4 mr-2" />
              Начать оборону
            </Button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {/* Station at bottom */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{ width: 60, height: 20 }}
            >
              <div
                className="w-full h-full rounded-t-lg"
                style={{
                  background: stationHealth > 50
                    ? 'linear-gradient(180deg, #00f0ff33, #00f0ff11)'
                    : stationHealth > 25
                    ? 'linear-gradient(180deg, #fbbf2433, #fbbf2411)'
                    : 'linear-gradient(180deg, #ef444433, #ef444411)',
                  borderTop: `2px solid ${stationHealth > 50 ? '#00f0ff' : stationHealth > 25 ? '#fbbf24' : '#ef4444'}`,
                }}
              />
            </div>

            {/* Asteroids */}
            {asteroids.map(a => (
              <motion.button
                key={a.id}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  width: a.size,
                  height: a.size,
                  transform: `translate(-50%, -50%) rotate(${a.rotation}deg)`,
                }}
                onClick={() => handleAsteroidTap(a)}
                whileTap={{ scale: 0.85 }}
              >
                {/* Asteroid body */}
                <div
                  className="relative w-full h-full rounded-full"
                  style={{
                    background: `radial-gradient(ellipse at 35% 35%, #8b7355, #5c4a3a 50%, #3d2f22)`,
                    boxShadow: 'inset -3px -3px 6px rgba(0,0,0,0.5), 0 0 4px rgba(139, 115, 85, 0.3)',
                  }}
                >
                  {/* Craters */}
                  <div className="absolute w-2 h-2 rounded-full bg-black/30 top-[25%] left-[30%]" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-black/20 top-[55%] left-[60%]" />
                  <div className="absolute w-1 h-1 rounded-full bg-black/25 top-[40%] left-[50%]" />

                  {/* HP indicator for multi-hit */}
                  {a.maxHp > 1 && (
                    <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                      {Array.from({ length: a.hp }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-neon-red"
                          style={{ boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}

            {/* Particles */}
            {particles.map(p => (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  opacity: p.life / p.maxLife,
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </>
        )}

        {/* End game overlay */}
        {gameState === 'ended' && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(10, 10, 26, 0.9)' }}
          >
            {result === 'won' ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <Shield className="w-16 h-16 text-neon-green" style={{ filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.6))' }} />
                </motion.div>
                <h3 className="text-xl font-bold neon-text-cyan">Оборона успешна!</h3>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-neon-yellow" />
                  <span className="text-lg font-mono text-neon-yellow">{score} астероидов</span>
                </div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <Skull className="w-16 h-16 text-neon-red" style={{ filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))' }} />
                </motion.div>
                <h3 className="text-xl font-bold text-neon-red">Оборона провалена!</h3>
                <span className="text-sm text-muted-foreground">Станция получила повреждения</span>
              </>
            )}
            <Button
              className="mt-2 holo-btn neon-border text-neon-cyan hover:text-neon-cyan"
              style={{ background: 'rgba(0, 240, 255, 0.1)' }}
              onClick={startGame}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Ещё раз
            </Button>
          </motion.div>
        )}
      </div>

      {gameState === 'playing' && (
        <p className="text-[10px] font-mono text-muted-foreground text-center">
          Нажимайте на астероиды, чтобы уничтожить их
        </p>
      )}
    </div>
  );
}

// ============================================
// Main MiniGames Component
// ============================================
export default function MiniGames() {
  return (
    <div className="h-full flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 neon-border" style={{ background: 'rgba(15, 15, 35, 0.95)' }}>
        <Zap className="w-5 h-5 text-neon-orange" />
        <h2 className="text-sm font-bold neon-text-orange uppercase tracking-wider">Мини-игры</h2>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scanner" className="flex-1 flex flex-col mt-2">
        <div className="px-4">
          <TabsList
            className="w-full h-9"
            style={{ background: 'rgba(15, 15, 35, 0.9)', border: '1px solid rgba(100, 200, 255, 0.1)' }}
          >
            <TabsTrigger
              value="scanner"
              className="flex-1 text-xs data-[state=active]:text-neon-cyan data-[state=active]:bg-cyan-500/10"
            >
              <Radar className="w-3.5 h-3.5 mr-1" />
              Сканер
            </TabsTrigger>
            <TabsTrigger
              value="asteroids"
              className="flex-1 text-xs data-[state=active]:text-neon-orange data-[state=active]:bg-orange-500/10"
            >
              <Asterisk className="w-3.5 h-3.5 mr-1" />
              Оборона
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scanner" className="flex-1 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center pt-4 pb-20">
            <SectorScanner />
          </div>
        </TabsContent>

        <TabsContent value="asteroids" className="flex-1 overflow-y-auto">
          <div className="p-4 pb-20">
            <AsteroidDefense />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}