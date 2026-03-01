import { useRef, useState, useEffect, useCallback } from 'react';
import type { FlowNode, FlowEdge, LaneInfo } from './TaskFlowView';
import { NODE_WIDTH, NODE_HEIGHT } from './TaskFlowView';
import styles from './FlowMinimap.module.css';

interface FlowMinimapProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes: LaneInfo[];
  nodeMap: Map<string, FlowNode>;
  totalWidth: number;
  totalHeight: number;
  pan: { x: number; y: number };
  zoom: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPanChange: (p: { x: number; y: number }) => void;
  selectedId: string | null;
}

const MINIMAP_WIDTH = 180;
const MAX_HEIGHT = 300;
const PADDING = 4;
const INNER_WIDTH = MINIMAP_WIDTH - PADDING * 2;
const INNER_MAX_HEIGHT = MAX_HEIGHT - PADDING * 2;

function statusColor(s: string): string {
  switch (s) {
    case 'done': return 'var(--status-done)';
    case 'in_progress': return 'var(--status-inprogress)';
    default: return 'var(--status-locked)';
  }
}

export function FlowMinimap({
  nodes, edges, lanes, nodeMap,
  totalWidth, totalHeight,
  pan, zoom,
  containerRef, onPanChange, selectedId,
}: FlowMinimapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // コンテナサイズ監視
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    // 初期サイズ取得
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [containerRef]);

  if (totalWidth <= 0 || totalHeight <= 0) return null;

  const effectiveScale = Math.min(INNER_WIDTH / totalWidth, INNER_MAX_HEIGHT / totalHeight);
  const minimapHeight = totalHeight * effectiveScale + PADDING * 2;
  const svgW = MINIMAP_WIDTH;
  const svgH = minimapHeight;

  // ビューポート矩形（ワールド座標）
  const vpX = -pan.x / zoom;
  const vpY = -pan.y / zoom;
  const vpW = containerSize.w / zoom;
  const vpH = containerSize.h / zoom;

  // ミニマップ上のビューポート矩形
  const rvX = vpX * effectiveScale + PADDING;
  const rvY = vpY * effectiveScale + PADDING;
  const rvW = vpW * effectiveScale;
  const rvH = vpH * effectiveScale;

  // ミニマップ座標→ワールド座標変換してpanをセット
  const jumpTo = useCallback((minimapX: number, minimapY: number) => {
    const worldX = (minimapX - PADDING) / effectiveScale;
    const worldY = (minimapY - PADDING) / effectiveScale;
    // ビューポート中心をこの点にする
    onPanChange({
      x: -(worldX - containerSize.w / zoom / 2) * zoom,
      y: -(worldY - containerSize.h / zoom / 2) * zoom,
    });
  }, [effectiveScale, containerSize, zoom, onPanChange]);

  const getMinimapCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = true;
    const pos = getMinimapCoords(e);
    jumpTo(pos.x, pos.y);
  }, [getMinimapCoords, jumpTo]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draggingRef.current) return;
    const pos = getMinimapCoords(e);
    jumpTo(pos.x, pos.y);
  }, [getMinimapCoords, jumpTo]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    draggingRef.current = false;
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    draggingRef.current = false;
  }, []);

  return (
    <div
      className={styles.minimap}
      style={{ width: svgW, height: svgH }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        ref={svgRef}
        className={styles.svg}
        width={svgW}
        height={svgH}
      >
        {/* レーン背景 */}
        {lanes.map((lane) => (
          <rect
            key={lane.name}
            x={PADDING}
            y={lane.y * effectiveScale + PADDING}
            width={totalWidth * effectiveScale}
            height={lane.height * effectiveScale}
            fill={lane.bg}
          />
        ))}

        {/* エッジ（直線） */}
        {edges.map((e, i) => {
          const from = nodeMap.get(e.from);
          const to = nodeMap.get(e.to);
          if (!from || !to) return null;
          const x1 = (from.x + NODE_WIDTH) * effectiveScale + PADDING;
          const y1 = (from.y + NODE_HEIGHT / 2) * effectiveScale + PADDING;
          const x2 = to.x * effectiveScale + PADDING;
          const y2 = (to.y + NODE_HEIGHT / 2) * effectiveScale + PADDING;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              className={styles.edge}
            />
          );
        })}

        {/* ノード（矩形） */}
        {nodes.map((n) => (
          <rect
            key={n.taskId}
            x={n.x * effectiveScale + PADDING}
            y={n.y * effectiveScale + PADDING}
            width={NODE_WIDTH * effectiveScale}
            height={NODE_HEIGHT * effectiveScale}
            fill={statusColor(n.status)}
            opacity={n.taskId === selectedId ? 1 : 0.7}
            rx={1}
          />
        ))}

        {/* ビューポート矩形 */}
        <rect
          x={rvX} y={rvY}
          width={rvW} height={rvH}
          className={styles.viewport}
        />
      </svg>
    </div>
  );
}
