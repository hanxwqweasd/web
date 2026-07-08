'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game/store';
import { RESOURCE_CONFIG } from '@/lib/game/constants';
import type { MapNode } from '@/lib/game/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Crosshair,
  Eye,
  Swords,
  MapPin,
  Shield,
  Zap,
  Star,
  Skull,
  Sparkles,
  Anchor,
  CircleDot,
  Target,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';

// Icon map for node types
const NODE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  station: Anchor,
  anomaly: Sparkles,
  pirate: Skull,
  neutral: Star,
  empty: CircleDot,
};

const NODE_COLORS: Record<string, string> = {
  station: '#00f0ff',
  anomaly: '#a855f7',
  pirate: '#ef4444',
  neutral: '#fbbf24',
  empty: '#4a5568',
};

const TYPE_LABELS: Record<string, string> = {
  station: 'Станция',
  anomaly: 'Аномалия',
  pirate: 'Пиратская база',
  neutral: 'Нейтральная станция',
  empty: 'Пустой сектор',
};

// Connection threshold — nodes within this distance get connected
const CONNECTION_DIST = 35;

function getNodeColor(node: MapNode): string {
  if (!node.discovered) return 'rgba(100, 100, 130, 0.25)';
  return NODE_COLORS[node.type] || '#4a5568';
}

function getGlowColor(node: MapNode): string {
  if (!node.discovered) return 'transparent';
  const c = NODE_COLORS[node.type] || '#4a5568';
  return c;
}

export default function MapView() {
  const mapNodes = useGameStore(s => s.mapNodes);
  const squadrons = useGameStore(s => s.squadrons);
  const discoverNode = useGameStore(s => s.discoverNode);
  const attackNode = useGameStore(s => s.attackNode);
  const getFleetPower = useGameStore(s => s.getFleetPower);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected node
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [selectedSquadron, setSelectedSquadron] = useState<string>('');

  // Connections between discovered nodes
  const connections = useMemo(() => {
    const discovered = mapNodes.filter(n => n.discovered);
    const lines: [MapNode, MapNode][] = [];
    for (let i = 0; i < discovered.length; i++) {
      for (let j = i + 1; j < discovered.length; j++) {
        const dx = discovered[i].x - discovered[j].x;
        const dy = discovered[i].y - discovered[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          lines.push([discovered[i], discovered[j]]);
        }
      }
    }
    return lines;
  }, [mapNodes]);

  // Center on home station
  const centerOnStation = useCallback(() => {
    const home = mapNodes.find(n => n.id === 'home');
    if (!home || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setPan({
      x: centerX - (home.x / 100) * rect.width * zoom,
      y: centerY - (home.y / 100) * rect.height * zoom,
    });
  }, [mapNodes, zoom]);

  // Initialize center on mount
  useEffect(() => {
    const timer = setTimeout(centerOnStation, 100);
    return () => clearTimeout(timer);
  }, [centerOnStation]);

  // Mouse/touch handlers for pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDist.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / lastTouchDist.current;
        const newZoom = Math.min(3, Math.max(0.5, zoom * scale));

        // Zoom toward touch center
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        setPan(prev => ({
          x: cx - (cx - prev.x) * (newZoom / zoom),
          y: cy - (cy - prev.y) * (newZoom / zoom),
        }));
        setZoom(newZoom);
        lastTouchDist.current = dist;
      }
    },
    [zoom]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(3, Math.max(0.5, zoom * scale));

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        setPan(prev => ({
          x: mx - (mx - prev.x) * (newZoom / zoom),
          y: my - (my - prev.y) * (newZoom / zoom),
        }));
      }
      setZoom(newZoom);
    },
    [zoom]
  );

  // Node click handler
  const handleNodeClick = useCallback(
    (node: MapNode, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (isDragging) return;
      setSelectedNode(node);
    },
    [isDragging]
  );

  // Discover action
  const handleDiscover = useCallback(() => {
    if (!selectedNode) return;
    discoverNode(selectedNode.id);
    toast.success(`Сектор «${selectedNode.name}» разведан!`);
    setSelectedNode(prev => (prev ? { ...prev, discovered: true } : null));
  }, [selectedNode, discoverNode]);

  // Attack action
  const handleAttack = useCallback(() => {
    if (!selectedNode || !selectedSquadron) return;
    if (selectedNode.type !== 'pirate' && selectedNode.type !== 'anomaly') {
      toast.error('Можно атаковать только пиратов и аномалии');
      return;
    }
    const result = attackNode(selectedNode.id, selectedSquadron);
    if (result) {
      if (result.victory) {
        toast.success(`Победа! +${result.ratingChange} рейтинга`);
      } else {
        toast.error(`Поражение. ${result.ratingChange} рейтинга`);
      }
    } else {
      toast.error('Не удалось начать атаку — выберите эскадру с кораблями');
    }
    setSelectedNode(null);
  }, [selectedNode, selectedSquadron, attackNode]);

  // Map click (deselect)
  const handleMapClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: '#0a0a1a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 neon-border" style={{ background: 'rgba(15, 15, 35, 0.95)' }}>
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-neon-cyan" />
          <h2 className="text-sm font-bold neon-text-cyan uppercase tracking-wider">Сектор Андромеда-7</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setZoom(prev => Math.min(3, prev * 1.2));
            }}
            className="h-7 w-7 p-0 text-neon-cyan hover:text-neon-cyan"
          >
            +
          </Button>
          <span className="text-xs font-mono text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setZoom(prev => Math.max(0.5, prev / 1.2));
            }}
            className="h-7 w-7 p-0 text-neon-cyan hover:text-neon-cyan"
          >
            −
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={centerOnStation}
            className="h-7 px-2 text-[10px] font-mono neon-border text-neon-cyan hover:text-neon-cyan"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Станция
          </Button>
        </div>
      </div>

      {/* Map area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: '#0a0a1a' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
        onClick={handleMapClick}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Map content with transform */}
        <div
          ref={mapRef}
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
          }}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            {connections.map(([a, b], i) => (
              <line
                key={`conn-${i}`}
                x1={`${a.x}%`}
                y1={`${a.y}%`}
                x2={`${b.x}%`}
                y2={`${b.y}%`}
                stroke="rgba(0, 240, 255, 0.12)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
          </svg>

          {/* Nodes */}
          {mapNodes.map((node) => {
            const Icon = NODE_ICONS[node.type];
            const color = getNodeColor(node);
            const glow = getGlowColor(node);
            const isSelected = selectedNode?.id === node.id;
            const isHome = node.owner === 'player';
            const isAttackable = node.type === 'pirate' || node.type === 'anomaly';

            return (
              <motion.div
                key={node.id}
                className="absolute"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 20 : 10,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: node.id === 'home' ? 0.1 : 0.3, duration: 0.4 }}
                onClick={(e) => handleNodeClick(node, e)}
              >
                {/* Glow ring */}
                {node.discovered && (
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: isHome ? 48 : 32,
                      height: isHome ? 48 : 32,
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: `radial-gradient(circle, ${glow}22 0%, transparent 70%)`,
                    }}
                    animate={
                      isHome
                        ? { scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }
                        : isAttackable
                        ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Node dot */}
                <motion.div
                  className="relative flex items-center justify-center rounded-full cursor-pointer"
                  style={{
                    width: isHome ? 44 : 30,
                    height: isHome ? 44 : 30,
                    background: node.discovered
                      ? `radial-gradient(circle, ${color}33 0%, ${color}11 60%, transparent 100%)`
                      : 'rgba(100, 100, 130, 0.15)',
                    border: `2px solid ${color}`,
                    boxShadow: isSelected
                      ? `0 0 20px ${color}, 0 0 40px ${color}44`
                      : node.discovered
                      ? `0 0 10px ${color}44`
                      : 'none',
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  {Icon && (
                    <Icon
                      className={node.discovered ? '' : 'opacity-30'}
                      style={{ color, width: isHome ? 20 : 14, height: isHome ? 20 : 14 }}
                    />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <motion.div
                      className="absolute inset-[-6px] rounded-full border-2"
                      style={{ borderColor: color }}
                      animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                {/* Name label */}
                {node.discovered && (
                  <div
                    className="absolute whitespace-nowrap text-center pointer-events-none"
                    style={{
                      top: isHome ? 52 : 38,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span
                      className="text-[10px] font-mono font-bold leading-tight block"
                      style={{ color, textShadow: `0 0 8px ${color}66` }}
                    >
                      {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
                    </span>
                    {node.danger > 0 && (
                      <span className="text-[8px] font-mono text-neon-red/70">
                        ⚠ Ур.{node.level}
                      </span>
                    )}
                  </div>
                )}

                {/* Undiscovered "?" */}
                {!node.discovered && (
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground/50">
                    ???
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          className="absolute bottom-3 left-3 flex flex-col gap-1.5 p-2.5 rounded-lg text-[9px] font-mono"
          style={{ background: 'rgba(10, 10, 26, 0.85)', border: '1px solid rgba(0, 240, 255, 0.15)' }}
        >
          {[
            { type: 'station', label: 'Ваша станция', color: NODE_COLORS.station },
            { type: 'pirate', label: 'Пираты', color: NODE_COLORS.pirate },
            { type: 'anomaly', label: 'Аномалия', color: NODE_COLORS.anomaly },
            { type: 'neutral', label: 'Нейтральные', color: NODE_COLORS.neutral },
          ].map(l => (
            <div key={l.type} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ y: 320, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-30"
            style={{
              background: 'rgba(10, 10, 30, 0.97)',
              borderTop: `1px solid ${getNodeColor(selectedNode)}44`,
              backdropFilter: 'blur(12px)',
              maxHeight: '55vh',
            }}
          >
            <ScrollArea className="max-h-[55vh]">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: `${getNodeColor(selectedNode)}22`,
                        border: `1px solid ${getNodeColor(selectedNode)}66`,
                      }}
                    >
                      {(() => {
                        const Icon = NODE_ICONS[selectedNode.type];
                        return Icon ? <Icon style={{ color: getNodeColor(selectedNode), width: 16, height: 16 }} /> : null;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: getNodeColor(selectedNode) }}>
                        {selectedNode.name}
                      </h3>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {TYPE_LABELS[selectedNode.type]} · Ур. {selectedNode.level}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setSelectedNode(null)}
                  >
                    <ChevronLeft className="w-4 h-4 rotate-90" />
                  </Button>
                </div>

                {/* Danger rating */}
                {selectedNode.danger > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono text-muted-foreground">Опасность:</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-sm"
                          style={{
                            background: i < selectedNode.danger
                              ? i < 4
                                ? '#22c55e'
                                : i < 7
                                ? '#fbbf24'
                                : '#ef4444'
                              : 'rgba(100, 100, 130, 0.3)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-neon-orange">{selectedNode.danger}/10</span>
                  </div>
                )}

                {/* Resources preview */}
                {selectedNode.discovered && Object.keys(selectedNode.resources).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(selectedNode.resources).map(([key, val]) => {
                      if (!val) return null;
                      const config = RESOURCE_CONFIG[key as keyof typeof RESOURCE_CONFIG];
                      if (!config) return null;
                      return (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-[10px] gap-1"
                          style={{ borderColor: `${config.color}44`, color: config.color }}
                        >
                          <Zap className="w-2.5 h-2.5" style={{ color: config.color }} />
                          {val.toLocaleString('ru-RU')} {config.name}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-2">
                  {!selectedNode.discovered && (
                    <Button
                      size="sm"
                      className="flex-1 holo-btn neon-border text-neon-cyan hover:text-neon-cyan"
                      style={{ background: 'rgba(0, 240, 255, 0.1)' }}
                      onClick={handleDiscover}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Разведать
                    </Button>
                  )}

                  {(selectedNode.type === 'pirate' || selectedNode.type === 'anomaly') && selectedNode.discovered && (
                    <>
                      {squadrons.length > 0 ? (
                        <div className="flex-1 flex flex-col gap-2">
                          <select
                            value={selectedSquadron}
                            onChange={(e) => setSelectedSquadron(e.target.value)}
                            className="w-full h-8 px-2 rounded-md text-xs font-mono neon-border"
                            style={{ background: 'rgba(10, 10, 30, 0.9)', color: '#e2e8f0' }}
                          >
                            <option value="">Выберите эскадру...</option>
                            {squadrons.map(sq => {
                              const power = getFleetPower(sq.id);
                              return (
                                <option key={sq.id} value={sq.id}>
                                  {sq.name} (⚔{power.attack} 🛡{power.defense})
                                </option>
                              );
                            })}
                          </select>
                          <Button
                            size="sm"
                            className="w-full holo-btn"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#ef4444',
                            }}
                            disabled={!selectedSquadron}
                            onClick={handleAttack}
                          >
                            <Swords className="w-4 h-4 mr-1" />
                            Атаковать
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 p-3 rounded-lg text-center text-xs text-muted-foreground neon-border">
                          <Shield className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
                          Создайте эскадру в Ангаре для атаки
                        </div>
                      )}
                    </>
                  )}

                  {selectedNode.type === 'neutral' && selectedNode.discovered && (
                    <div className="flex-1 p-3 rounded-lg text-center text-xs text-muted-foreground neon-border">
                      <Star className="w-6 h-6 mx-auto mb-1 text-neon-yellow/50" />
                      Нейтральная станция — торговля доступна позже
                    </div>
                  )}

                  {selectedNode.type === 'empty' && selectedNode.discovered && (
                    <div className="flex-1 p-3 rounded-lg text-center text-xs text-muted-foreground neon-border">
                      <CircleDot className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
                      Пустой сектор — здесь ничего нет
                    </div>
                  )}

                  {selectedNode.type === 'station' && selectedNode.discovered && (
                    <div className="flex-1 p-3 rounded-lg text-center text-xs neon-border" style={{ color: '#00f0ff' }}>
                      <Target className="w-6 h-6 mx-auto mb-1 text-neon-cyan" />
                      Это ваша станция — ФОРПОСТ-7
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}