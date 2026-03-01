import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { EnrichedTask } from '../../domain/taskFilters';
import type { TaskStatus } from '../../db/types';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTraders } from '../../api/hooks';
import { useT } from '../../i18n';
import { FlowMinimap } from './FlowMinimap';
import { Maximize, Minimize } from 'lucide-react';
import styles from './TaskFlowView.module.css';

interface TaskFlowViewProps {
  tasks: EnrichedTask[];
  prereqEdges: Map<string, string[]>;
  fullscreenRef?: React.RefObject<HTMLDivElement | null>;
}

export interface FlowNode {
  taskId: string;
  name: string;
  traderName: string;
  status: TaskStatus;
  layer: number;
  x: number;
  y: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  isDashed: boolean;
}

export interface LaneInfo {
  name: string;
  bg: string;
  y: number;
  height: number;
}

export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 48;
const LAYER_GAP = 200;
const NODE_GAP = 50;
const LANE_LABEL_WIDTH = 110;
const LANE_PADDING_TOP = 12;
const LANE_PADDING_BOTTOM = 12;
const LANE_GAP = 4;

// ズーム設定
const ZOOM_MIN = 0.1;   // 最小倍率（全体表示用に低めに設定）
const ZOOM_MAX = 2;     // 最大倍率
const ZOOM_STEP = 0.1;  // ホイール1回あたりのズーム変化量

const TRADER_LANES = [
  { name: 'Prapor',      bg: 'rgba(180, 50, 40, 0.12)' },
  { name: 'Therapist',   bg: 'rgba(120, 60, 160, 0.12)' },
  { name: 'Skier',       bg: 'rgba(30, 120, 130, 0.12)' },
  { name: 'Peacekeeper', bg: 'rgba(40, 60, 120, 0.12)' },
  { name: 'Mechanic',    bg: 'rgba(30, 110, 50, 0.12)' },
  { name: 'Ragman',      bg: 'rgba(140, 120, 30, 0.12)' },
  { name: 'Jaeger',      bg: 'rgba(160, 140, 20, 0.12)' },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function computeSwimlaneLayout(
  tasks: EnrichedTask[],
  prereqEdges: Map<string, string[]>,
): { nodes: FlowNode[]; edges: FlowEdge[]; lanes: LaneInfo[]; totalWidth: number; totalHeight: number } {
  const taskSet = new Set(tasks.map((t) => t.quest.id));

  // トポロジカルソート用の入次数を計算
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const id of taskSet) {
    inDegree.set(id, 0);
    adjList.set(id, []);
  }

  const edges: FlowEdge[] = [];

  for (const t of tasks) {
    const prereqs = prereqEdges.get(t.quest.id) ?? [];
    for (const pid of prereqs) {
      if (taskSet.has(pid)) {
        adjList.get(pid)!.push(t.quest.id);
        inDegree.set(t.quest.id, (inDegree.get(t.quest.id) ?? 0) + 1);
        edges.push({ from: pid, to: t.quest.id, isDashed: false });
      } else {
        edges.push({ from: pid, to: t.quest.id, isDashed: true });
      }
    }
  }

  // トポロジカルソート（カーンのアルゴリズム）でレイヤーを割り当て
  const queue: string[] = [];
  const layerMap = new Map<string, number>();

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const layer = layerMap.get(id) ?? 0;

    for (const next of adjList.get(id) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      layerMap.set(next, Math.max(layerMap.get(next) ?? 0, layer + 1));
      if (newDeg === 0) queue.push(next);
    }
  }

  // 残りの（循環）ノードをレイヤー0に割り当て
  for (const id of taskSet) {
    if (!layerMap.has(id)) layerMap.set(id, 0);
  }

  // トレーダー × レイヤーでグループ化
  const traderLayerMap = new Map<string, Map<number, EnrichedTask[]>>();
  for (const t of tasks) {
    const trader = t.quest.traderName;
    const layer = layerMap.get(t.quest.id) ?? 0;
    if (!traderLayerMap.has(trader)) traderLayerMap.set(trader, new Map());
    const layerGroup = traderLayerMap.get(trader)!;
    if (!layerGroup.has(layer)) layerGroup.set(layer, []);
    layerGroup.get(layer)!.push(t);
  }

  // 各列内でソート: minPlayerLevel昇順 → name昇順
  for (const layerGroup of traderLayerMap.values()) {
    for (const columnTasks of layerGroup.values()) {
      columnTasks.sort((a, b) => {
        const levelDiff = (a.quest.minPlayerLevel ?? 0) - (b.quest.minPlayerLevel ?? 0);
        if (levelDiff !== 0) return levelDiff;
        return a.quest.name.localeCompare(b.quest.name);
      });
    }
  }

  // 第2パス: 前提タスクのY行位置に揃える
  // taskId → 行インデックスのマッピングを構築
  const rowIndexMap = new Map<string, number>();

  function alignLayerGroup(layerGroup: Map<number, EnrichedTask[]>) {
    const maxLayer = Math.max(...Array.from(layerGroup.keys()), 0);
    // 全レイヤーの最大行数を求める
    let maxRows = 0;
    for (const columnTasks of layerGroup.values()) {
      maxRows = Math.max(maxRows, columnTasks.length);
    }

    // レイヤー0: ソート順のままrow indexを割り当て
    const layer0 = layerGroup.get(0);
    if (layer0) {
      layer0.forEach((t, idx) => rowIndexMap.set(t.quest.id, idx));
    }

    // レイヤー1以降: 前提タスクの行位置に揃える
    for (let l = 1; l <= maxLayer; l++) {
      const columnTasks = layerGroup.get(l);
      if (!columnTasks) continue;

      const occupied = new Set<number>();
      const assigned = new Map<EnrichedTask, number>();

      // 前提タスクが前レイヤーにある場合、その行を希望位置とする
      const withDesired: { task: EnrichedTask; desired: number }[] = [];
      const withoutDesired: EnrichedTask[] = [];

      for (const t of columnTasks) {
        const prereqs = prereqEdges.get(t.quest.id) ?? [];
        let desired: number | null = null;
        for (const pid of prereqs) {
          if (rowIndexMap.has(pid) && layerMap.get(pid) === l - 1) {
            desired = rowIndexMap.get(pid)!;
            break;
          }
        }
        if (desired !== null) {
          withDesired.push({ task: t, desired });
        } else {
          withoutDesired.push(t);
        }
      }

      // 希望位置でソート（衝突時に近い位置を探しやすくする）
      withDesired.sort((a, b) => a.desired - b.desired);

      for (const { task, desired } of withDesired) {
        if (!occupied.has(desired)) {
          assigned.set(task, desired);
          occupied.add(desired);
        } else {
          // 最も近い空き位置を探す
          let offset = 1;
          while (true) {
            if (desired - offset >= 0 && !occupied.has(desired - offset)) {
              assigned.set(task, desired - offset);
              occupied.add(desired - offset);
              break;
            }
            if (!occupied.has(desired + offset)) {
              assigned.set(task, desired + offset);
              occupied.add(desired + offset);
              break;
            }
            offset++;
          }
        }
      }

      // 前提なしタスクは空きスロットに配置
      let nextSlot = 0;
      for (const t of withoutDesired) {
        while (occupied.has(nextSlot)) nextSlot++;
        assigned.set(t, nextSlot);
        occupied.add(nextSlot);
        nextSlot++;
      }

      // rowIndexMapに記録し、maxRowsを更新
      for (const [t, row] of assigned) {
        rowIndexMap.set(t.quest.id, row);
        maxRows = Math.max(maxRows, row + 1);
      }
    }

    return maxRows;
  }

  // レーンを構築（タスクのあるトレーダーのみ）、TRADER_LANES順に従う
  const lanes: LaneInfo[] = [];
  const nodes: FlowNode[] = [];
  let currentY = 0;

  for (const traderDef of TRADER_LANES) {
    const layerGroup = traderLayerMap.get(traderDef.name);
    if (!layerGroup) continue; // タスクのないトレーダーはスキップ

    const maxRows = alignLayerGroup(layerGroup);

    const laneHeight = LANE_PADDING_TOP + maxRows * (NODE_HEIGHT + NODE_GAP) - NODE_GAP + LANE_PADDING_BOTTOM;

    lanes.push({
      name: traderDef.name,
      bg: traderDef.bg,
      y: currentY,
      height: laneHeight,
    });

    // 整列された行インデックスを使ってこのレーン内にノードを配置
    for (const [layer, columnTasks] of layerGroup) {
      for (const t of columnTasks) {
        const row = rowIndexMap.get(t.quest.id) ?? 0;
        nodes.push({
          taskId: t.quest.id,
          name: t.quest.name,
          traderName: t.quest.traderName,
          status: t.status,
          layer,
          x: LANE_LABEL_WIDTH + layer * LAYER_GAP + 20,
          y: currentY + LANE_PADDING_TOP + row * (NODE_HEIGHT + NODE_GAP),
        });
      }
    }

    currentY += laneHeight + LANE_GAP;
  }

  // TRADER_LANESに含まれないトレーダーの処理（フォールバック）
  for (const [trader, layerGroup] of traderLayerMap) {
    if (TRADER_LANES.some((tl) => tl.name === trader)) continue;

    const maxRows = alignLayerGroup(layerGroup);

    const laneHeight = LANE_PADDING_TOP + maxRows * (NODE_HEIGHT + NODE_GAP) - NODE_GAP + LANE_PADDING_BOTTOM;

    lanes.push({
      name: trader,
      bg: 'rgba(100, 100, 100, 0.12)',
      y: currentY,
      height: laneHeight,
    });

    for (const [layer, columnTasks] of layerGroup) {
      for (const t of columnTasks) {
        const row = rowIndexMap.get(t.quest.id) ?? 0;
        nodes.push({
          taskId: t.quest.id,
          name: t.quest.name,
          traderName: t.quest.traderName,
          status: t.status,
          layer,
          x: LANE_LABEL_WIDTH + layer * LAYER_GAP + 20,
          y: currentY + LANE_PADDING_TOP + row * (NODE_HEIGHT + NODE_GAP),
        });
      }
    }

    currentY += laneHeight + LANE_GAP;
  }

  const maxLayer = Math.max(...Array.from(layerMap.values()), 0);
  const totalWidth = Math.max(LANE_LABEL_WIDTH + (maxLayer + 1) * LAYER_GAP + 40, 600);
  const totalHeight = Math.max(currentY, 400);

  return { nodes, edges: edges.filter((e) => taskSet.has(e.to)), lanes, totalWidth, totalHeight };
}

function statusClass(s: TaskStatus) {
  if (s === 'done') return styles.nodeDone;
  if (s === 'in_progress') return styles.nodeInProgress;
  return styles.nodeNotStarted;
}

function getTouchDistance(t1: React.Touch, t2: React.Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function TaskFlowView({ tasks, prereqEdges, fullscreenRef }: TaskFlowViewProps) {
  const t = useT();
  const selectedId = useSelectionStore((s) => s.selectedTaskId);
  const setSelected = useSelectionStore((s) => s.setSelectedTaskId);
  const { data: traders } = useTraders();

  // トレーダー名→imageLink のMap
  const traderImageMap = useMemo(() => {
    const m = new Map<string, string>();
    if (traders) {
      for (const tr of traders) {
        if (tr.imageLink) m.set(tr.name, tr.imageLink);
      }
    }
    return m;
  }, [traders]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number; cx: number; cy: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // タップ（移動量小）とドラッグを区別するためのref
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  // ピンチ操作中のタップ誤選択を防止するためのref
  const wasPinchingRef = useRef(false);
  // マウスドラッグ移動量を追跡（クリックとドラッグを区別）
  const mouseMovedRef = useRef(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const target = fullscreenRef?.current ?? containerRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      target.requestFullscreen();
    }
  }, [fullscreenRef]);

  const fitAll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const { totalWidth: tw, totalHeight: th } = layoutRef.current;
    if (tw === 0 || th === 0) return;
    const PADDING = 24;
    const fitZoom = clamp(Math.min((cw - PADDING) / tw, (ch - PADDING) / th), ZOOM_MIN, ZOOM_MAX);
    const fitX = (cw - tw * fitZoom) / 2;
    const fitY = (ch - th * fitZoom) / 2;
    setZoom(fitZoom);
    setPan({ x: fitX, y: fitY });
  }, []);

  const { nodes, edges, lanes, totalWidth, totalHeight } = useMemo(
    () => computeSwimlaneLayout(tasks, prereqEdges),
    [tasks, prereqEdges],
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, FlowNode>();
    for (const n of nodes) m.set(n.taskId, n);
    return m;
  }, [nodes]);

  // wheel effect (deps=[]) から最新のレイアウトサイズを参照するためのref
  const layoutRef = useRef({ totalWidth, totalHeight });
  layoutRef.current = { totalWidth, totalHeight };

  // パンをワールド範囲内にクランプ（全方向にマージン付き）
  const PAN_MARGIN = 200;
  const clampPanValues = useCallback((p: { x: number; y: number }, z: number) => {
    const el = containerRef.current;
    if (!el) return p;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const { totalWidth: tw, totalHeight: th } = layoutRef.current;
    const minX = Math.min(0, cw - tw * z) - PAN_MARGIN;
    const maxX = Math.max(0, cw - tw * z) + PAN_MARGIN;
    const minY = Math.min(0, ch - th * z) - PAN_MARGIN;
    const maxY = Math.max(0, ch - th * z) + PAN_MARGIN;
    return { x: clamp(p.x, minX, maxX), y: clamp(p.y, minY, maxY) };
  }, []);

  // フィルタ変更等でレイアウトが変わった場合、panを原点にリセット
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [totalWidth, totalHeight]);

  // non-passive リスナーで preventDefault() を確実に効かせる
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setZoom((prevZoom) => {
        const newZoom = clamp(prevZoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);
        setPan((prevPan) => {
          const wx = (cx - prevPan.x) / prevZoom;
          const wy = (cy - prevPan.y) / prevZoom;
          return clampPanValues({ x: cx - wx * newZoom, y: cy - wy * newZoom }, newZoom);
        });
        return newZoom;
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [clampPanValues]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    mouseMovedRef.current = false;
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    if (!mouseMovedRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        mouseMovedRef.current = true;
      }
    }
    setPan(clampPanValues({
      x: dragRef.current.panX + e.clientX - dragRef.current.startX,
      y: dragRef.current.panY + e.clientY - dragRef.current.startY,
    }, zoom));
  }, [clampPanValues, zoom]);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // モバイル用タッチハンドラ（パン＆ピンチズーム）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchMovedRef.current = false;
    if (e.touches.length === 2) {
      // ピンチ開始
      wasPinchingRef.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - (rect?.left ?? 0);
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - (rect?.top ?? 0);
      pinchRef.current = { startDist: getTouchDistance(e.touches[0], e.touches[1]), startZoom: zoom, cx, cy, panX: pan.x, panY: pan.y };
      dragRef.current = null;
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan, zoom]);

  const handleTouchMoveNative = useCallback((e: TouchEvent) => {
    e.preventDefault();
    // タップとドラッグを区別するため移動量を追跡
    if (!touchMovedRef.current && touchStartPosRef.current && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartPosRef.current.x;
      const dy = e.touches[0].clientY - touchStartPosRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) {
        touchMovedRef.current = true;
      }
    }
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = dist / pinchRef.current.startDist;
      const newZoom = clamp(pinchRef.current.startZoom * scale, ZOOM_MIN, ZOOM_MAX);
      // ピンチ中心が固定されるようにパンを調整
      const { cx, cy, panX, panY, startZoom } = pinchRef.current;
      const wx = (cx - panX) / startZoom;
      const wy = (cy - panY) / startZoom;
      setPan(clampPanValues({ x: cx - wx * newZoom, y: cy - wy * newZoom }, newZoom));
      setZoom(newZoom);
    } else if (e.touches.length === 1 && dragRef.current && !pinchRef.current) {
      setPan(clampPanValues({
        x: dragRef.current.panX + e.touches[0].clientX - dragRef.current.startX,
        y: dragRef.current.panY + e.touches[0].clientY - dragRef.current.startY,
      }, zoom));
    }
  }, []);

  // non-passive リスナーで touchmove の preventDefault() を確実に効かせる
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMoveNative);
  }, [handleTouchMoveNative]);

  const handleTouchEnd = useCallback(() => {
    dragRef.current = null;
    pinchRef.current = null;
  }, []);

  if (tasks.length === 0) {
    return <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}><div className={styles.empty}>{t.flow_empty}</div></div>;
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={styles.surface}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, width: totalWidth, height: totalHeight }}
      >
        {/* Lane backgrounds */}
        {lanes.map((lane) => (
          <div
            key={lane.name}
            className={styles.lane}
            style={{ top: lane.y, width: totalWidth, height: lane.height, background: lane.bg }}
          >
            <div className={styles.laneLabel}>
              {traderImageMap.get(lane.name) && (
                <img
                  src={traderImageMap.get(lane.name)}
                  alt=""
                  className={styles.traderAvatar}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {lane.name}
            </div>
          </div>
        ))}

        {/* Edges (bezier curves) */}
        <svg className={styles.edges} width={totalWidth} height={totalHeight}>
          {edges.map((e, i) => {
            const from = nodeMap.get(e.from);
            const to = nodeMap.get(e.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_WIDTH;
            const y1 = from.y + NODE_HEIGHT / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_HEIGHT / 2;
            const cx = (x1 + x2) / 2;
            const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
            const highlighted = selectedId != null && (e.from === selectedId || e.to === selectedId);
            const done = from.status === 'done';
            const crossLane = from.traderName !== to.traderName;
            const edgeCls = [
              styles.edge,
              e.isDashed ? styles.edgeDashed : '',
              done ? styles.edgeDone : '',
              highlighted ? styles.edgeHighlight : '',
            ].filter(Boolean).join(' ');
            const marker = done ? 'url(#arrowhead-done)' : highlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)';
            return (
              <path
                key={i}
                d={d}
                className={edgeCls}
                markerEnd={marker}
                opacity={crossLane && !highlighted ? 0.5 : 1}
              />
            );
          })}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border-default)" />
            </marker>
            <marker id="arrowhead-done" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
              <polygon points="0 0, 10 4, 0 8" fill="#1e8449" />
            </marker>
            <marker id="arrowhead-highlight" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--accent-khaki)" />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {nodes.map((n) => (
          <div
            key={n.taskId}
            className={`${styles.node} ${statusClass(n.status)} ${selectedId === n.taskId ? styles.nodeSelected : ''}`}
            style={{ left: n.x, top: n.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
            onClick={(e) => { e.stopPropagation(); if (!mouseMovedRef.current) setSelected(n.taskId); }}
            onTouchEnd={(e) => { if (!touchMovedRef.current) { e.stopPropagation(); setSelected(n.taskId); } }}
          >
            <div className={styles.nodeName}>{n.name}</div>
            <div className={styles.nodeTrader}>{n.traderName}</div>
          </div>
        ))}
      </div>
      <div className={styles.toolbar}>
        <button
          className={styles.toolbarBtn}
          onClick={fitAll}
          onMouseDown={(e) => e.stopPropagation()}
          title={t.flow_fit}
        >
          {'⊞'}
        </button>
        <button
          className={styles.toolbarBtn}
          onClick={toggleFullscreen}
          onMouseDown={(e) => e.stopPropagation()}
          title={isFullscreen ? t.flow_exit_fullscreen : t.flow_fullscreen}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
      <FlowMinimap
        nodes={nodes} edges={edges} lanes={lanes} nodeMap={nodeMap}
        totalWidth={totalWidth} totalHeight={totalHeight}
        pan={pan} zoom={zoom}
        containerRef={containerRef}
        onPanChange={(p) => setPan(clampPanValues(p, zoom))}
        selectedId={selectedId}
      />
    </div>
  );
}
