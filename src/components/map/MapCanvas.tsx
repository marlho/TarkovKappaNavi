import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MapPin, Maximize, Minimize, Map as MapIcon } from 'lucide-react';
import type { MapPinRow, PinColor, PinShape } from '../../db/types';
import { useT } from '../../i18n';
import { PinEditPopover } from './PinEditPopover';
import styles from './MapCanvas.module.css';

const PIN_COLORS: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  yellow: '#f1c40f',
  green: '#2ecc71',
  purple: '#9b59b6',
  white: '#ecf0f1',
};

export interface EditingPin {
  pin?: MapPinRow;
  x: number; // % coordinate on map
  y: number; // % coordinate on map
}

interface MapCanvasProps {
  mapId: string;
  normalizedName?: string;
  userPins: MapPinRow[];
  isPlacingPin: boolean;
  editingPin: EditingPin | null;
  onMapClick: (xPct: number, yPct: number) => void;
  onUserPinClick: (pin: MapPinRow) => void;
  onEditSave: (label: string, color: PinColor, shape: PinShape) => void;
  onEditCancel: () => void;
  onEditDelete?: () => void;
  onPinDragEnd: (pinId: string, xPct: number, yPct: number) => void;
  onStartPlacingPin?: () => void;
  onCancelPlacingPin?: () => void;
  viewMode: '2d' | '3d';
  onViewModeChange: (mode: '2d' | '3d') => void;
  pinOpacity: number;
  pinSize: number;
  showLabels: boolean;
}

export interface MapCanvasHandle {
  zoomToPoint: (xPct: number, yPct: number) => void;
}

export const MAPS_2D_ONLY = new Set(['factory', 'labs', 'terminal', 'labyrinth']);

export const MAP_IMAGE_ALIAS: Record<string, string> = {
  'streets-of-tarkov': 'streets',
  'the-lab': 'labs',
  'the-labyrinth': 'labyrinth',
  'night-factory': 'factory',
  'ground-zero-21': 'ground-zero',
  'ground-zero-tutorial': 'ground-zero',
};

function getMapImageUrl(normalizedName: string, viewMode: '2d' | '3d'): string {
  const imgName = MAP_IMAGE_ALIAS[normalizedName] ?? normalizedName;
  const suffix = MAPS_2D_ONLY.has(imgName) ? '2d' : viewMode;
  return `https://tarkov.dev/maps/${imgName}-${suffix}.jpg`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** パンをコンテナ境界にクランプ（画面半分のマージン許容） */
function clampPan(px: number, py: number, z: number, cw: number, ch: number) {
  const mx = cw / 2;
  const my = ch / 2;
  return {
    x: clamp(px, -(cw * z - mx), mx),
    y: clamp(py, -(ch * z - my), my),
  };
}

const CLICK_THRESHOLD = 5; // px — ドラッグとクリックを区別する閾値
const ZOOM_MIN = 1; // ズーム下限（等倍）
const ZOOM_MAX = 10; // ズーム上限
const ZOOM_STEP = 0.15; // ホイール1ノッチあたりのズーム増減量
const ZOOM_TO_POINT = 2; // zoomToPointで使うズーム倍率
const MINIMAP_WIDTH = 140; // ミニマップの幅(px)

const SHAPE_CLASS: Record<PinShape, string> = {
  circle: styles.shapeCircle,
  diamond: styles.shapeDiamond,
  square: styles.shapeSquare,
  triangle: styles.shapeTriangle,
  star: styles.shapeStar,
  marker: styles.shapeMarker,
};

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { normalizedName, userPins, isPlacingPin, editingPin, onMapClick, onUserPinClick, onEditSave, onEditCancel, onEditDelete, onPinDragEnd, onStartPlacingPin, onCancelPlacingPin, viewMode, onViewModeChange, pinOpacity, pinSize, showLabels },
  ref,
) {
  const t = useT();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // コールバック内でzoomの最新値を参照するためのref
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // panをref化（documentリスナーからの参照用）
  const panRef = useRef(pan);
  panRef.current = pan;

  // isPlacingPinをref化（イベントハンドラ内で最新値を参照）
  const isPlacingPinRef = useRef(isPlacingPin);
  isPlacingPinRef.current = isPlacingPin;

  // ピンドラッグの内部状態（ref=re-render不要）
  const pinDragRef = useRef<{
    pinId: string;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  // ドラッグ中のピンIDとドラッグ位置（state=描画更新用）
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { setImgError(false); }, [normalizedName]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // zoomToPoint: 指定の%座標にズーム&パン
  useImperativeHandle(ref, () => ({
    zoomToPoint(xPct: number, yPct: number) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const targetZoom = ZOOM_TO_POINT;
      const wx = (xPct / 100) * rect.width;
      const wy = (yPct / 100) * rect.height;
      const newPan = clampPan(
        rect.width / 2 - wx * targetZoom,
        rect.height / 2 - wy * targetZoom,
        targetZoom, rect.width, rect.height,
      );
      setPan(newPan);
      setZoom(targetZoom);
    },
  }), []);

  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number; cx: number; cy: number; panX: number; panY: number } | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (draggingPinId) return; // ドラッグ中はズーム無効
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const p = panRef.current;
    setZoom((prevZoom) => {
      const newZoom = clamp(prevZoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);
      const wx = (cx - p.x) / prevZoom;
      const wy = (cy - p.y) / prevZoom;
      setPan(clampPan(cx - wx * newZoom, cy - wy * newZoom, newZoom, rect.width, rect.height));
      return newZoom;
    });
  }, [draggingPinId]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    const p = panRef.current;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: p.x, panY: p.y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy, zoomRef.current, rect.width, rect.height));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const downPos = mouseDownPosRef.current;
    dragRef.current = null;
    mouseDownPosRef.current = null;

    if (!downPos) return;
    const dx = e.clientX - downPos.x;
    const dy = e.clientY - downPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ドラッグでなくクリックの場合のみマップクリックを発火
    if (dist < CLICK_THRESHOLD && isPlacingPinRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const p = panRef.current;
      const z = zoomRef.current;
      const xPct = ((e.clientX - rect.left - p.x) / z / rect.width) * 100;
      const yPct = ((e.clientY - rect.top - p.y) / z / rect.height) * 100;
      onMapClick(clamp(xPct, 0, 100), clamp(yPct, 0, 100));
    }
  }, [onMapClick]);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    mouseDownPosRef.current = null;
  }, []);

  // モバイル用タッチハンドラ（パン＆ピンチズーム）
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const p = panRef.current;
    const z = zoomRef.current;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - (rect?.left ?? 0);
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - (rect?.top ?? 0);
      pinchRef.current = { startDist: Math.sqrt(dx * dx + dy * dy), startZoom: z, cx, cy, panX: p.x, panY: p.y };
      dragRef.current = null;
    } else if (e.touches.length === 1) {
      pinchRef.current = null;
      mouseDownPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: p.x, panY: p.y };
    }
  }, []);

  // touchmoveはpassive:falseでネイティブ登録（useEffect内）
  const handleTouchMoveNative = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / pinchRef.current.startDist;
      const newZoom = clamp(pinchRef.current.startZoom * scale, ZOOM_MIN, ZOOM_MAX);
      const { cx, cy, panX, panY, startZoom } = pinchRef.current;
      const wx = (cx - panX) / startZoom;
      const wy = (cy - panY) / startZoom;
      const newPan = rect
        ? clampPan(cx - wx * newZoom, cy - wy * newZoom, newZoom, rect.width, rect.height)
        : { x: cx - wx * newZoom, y: cy - wy * newZoom };
      setPan(newPan);
      setZoom(newZoom);
    } else if (e.touches.length === 1 && dragRef.current && !pinchRef.current) {
      const rawX = dragRef.current.panX + e.touches[0].clientX - dragRef.current.startX;
      const rawY = dragRef.current.panY + e.touches[0].clientY - dragRef.current.startY;
      const newPan = rect
        ? clampPan(rawX, rawY, zoomRef.current, rect.width, rect.height)
        : { x: rawX, y: rawY };
      setPan(newPan);
    }
  }, []);

  // touchmoveをpassive:falseで登録
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMoveNative);
  }, [handleTouchMoveNative]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const downPos = mouseDownPosRef.current;
    dragRef.current = null;
    pinchRef.current = null;
    mouseDownPosRef.current = null;

    if (downPos && e.changedTouches.length === 1 && isPlacingPinRef.current) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - downPos.x;
      const dy = touch.clientY - downPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const p = panRef.current;
        const z = zoomRef.current;
        const xPct = ((touch.clientX - rect.left - p.x) / z / rect.width) * 100;
        const yPct = ((touch.clientY - rect.top - p.y) / z / rect.height) * 100;
        onMapClick(clamp(xPct, 0, 100), clamp(yPct, 0, 100));
      }
    }
  }, [onMapClick]);

  // ピンのpointerdownハンドラ
  const handlePinPointerDown = useCallback((clientX: number, clientY: number, pin: MapPinRow) => {
    pinDragRef.current = { pinId: pin.id, startX: clientX, startY: clientY, isDragging: false };
    setDraggingPinId(pin.id);
  }, []);

  // ピンドラッグ: documentレベルリスナー
  useEffect(() => {
    if (!draggingPinId) return;

    const handleMove = (clientX: number, clientY: number) => {
      const drag = pinDragRef.current;
      if (!drag) return;
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;

      if (!drag.isDragging) {
        if (Math.sqrt(dx * dx + dy * dy) < CLICK_THRESHOLD) return;
        drag.isDragging = true;
        onEditCancel(); // ポップオーバーを閉じる
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const z = zoomRef.current;
      const p = panRef.current;
      const xPct = ((clientX - rect.left - p.x) / z / rect.width) * 100;
      const yPct = ((clientY - rect.top - p.y) / z / rect.height) * 100;
      setDragPos({ x: clamp(xPct, 0, 100), y: clamp(yPct, 0, 100) });
    };

    const handleEnd = (clientX: number, clientY: number) => {
      const drag = pinDragRef.current;
      pinDragRef.current = null;

      if (drag?.isDragging) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const z = zoomRef.current;
          const p = panRef.current;
          const xPct = clamp(((clientX - rect.left - p.x) / z / rect.width) * 100, 0, 100);
          const yPct = clamp(((clientY - rect.top - p.y) / z / rect.height) * 100, 0, 100);
          onPinDragEnd(drag.pinId, xPct, yPct);
        }
      } else if (drag) {
        // ドラッグ未確定 → クリックとして処理
        const pin = userPins.find((p) => p.id === drag.pinId);
        if (pin) onUserPinClick(pin);
      }

      setDraggingPinId(null);
      setDragPos(null);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = (e: MouseEvent) => handleEnd(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // 2本指検出 → ドラッグキャンセル
        pinDragRef.current = null;
        setDraggingPinId(null);
        setDragPos(null);
        return;
      }
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [draggingPinId, onEditCancel, onPinDragEnd, onUserPinClick, userPins]);

  // ミニマップクリックでその位置にパン
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const mmRect = e.currentTarget.getBoundingClientRect();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fx = (e.clientX - mmRect.left) / mmRect.width;
    const fy = (e.clientY - mmRect.top) / mmRect.height;
    const mapX = fx * rect.width;
    const mapY = fy * rect.height;
    const z = zoomRef.current;
    setPan(clampPan(
      rect.width / 2 - mapX * z,
      rect.height / 2 - mapY * z,
      z, rect.width, rect.height,
    ));
  }, []);

  // PinEditPopover のスクリーン上の位置を計算
  const popoverPosition = editingPin ? (() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const screenX = (editingPin.x / 100) * rect.width * zoom + pan.x;
    const screenY = (editingPin.y / 100) * rect.height * zoom + pan.y;
    return { x: Math.min(screenX + 12, rect.width - 220), y: Math.min(screenY + 12, rect.height - 200) };
  })() : null;

  // ミニマップビューポート計算
  const rect = containerRef.current?.getBoundingClientRect();
  const mmVpLeft = rect ? (-pan.x / zoom) / rect.width * 100 : 0;
  const mmVpTop = rect ? (-pan.y / zoom) / rect.height * 100 : 0;
  const mmVpWidth = 100 / zoom;
  const mmVpHeight = 100 / zoom;
  const minimapHeight = rect ? Math.round(MINIMAP_WIDTH * rect.height / rect.width) : 100;

  const mapImageUrl = normalizedName ? getMapImageUrl(normalizedName, viewMode) : '';

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''} ${isPlacingPin ? styles.placing : ''} ${draggingPinId ? styles.pinDragActive : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ピン配置モードヒント */}
      {isPlacingPin && (
        <div className={styles.placingHint}>{t.map_pin_placing_hint}</div>
      )}
      {(() => {
        const imgName = normalizedName ? (MAP_IMAGE_ALIAS[normalizedName] ?? normalizedName) : '';
        const has3d = !MAPS_2D_ONLY.has(imgName);
        return (
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === '2d' ? styles.viewBtnActive : ''}`}
              onClick={() => onViewModeChange('2d')}
            >2D</button>
            <button
              className={`${styles.viewBtn} ${viewMode === '3d' ? styles.viewBtnActive : ''}`}
              disabled={!has3d}
              onClick={() => onViewModeChange('3d')}
            >3D</button>
          </div>
        );
      })()}
      <button
        className={styles.fullscreenBtn}
        onClick={toggleFullscreen}
        title={isFullscreen ? t.map_exit_fullscreen : t.map_fullscreen}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      <button
        className={`${styles.minimapBtn} ${showMinimap ? styles.minimapBtnActive : ''}`}
        onClick={() => setShowMinimap((v) => !v)}
        title={t.map_minimap}
      >
        <MapIcon size={18} />
      </button>
      {isPlacingPin ? (
        onCancelPlacingPin && (
          <button
            className={`${styles.addPinBtn} ${styles.addPinBtnCancel}`}
            onClick={(e) => { e.stopPropagation(); onCancelPlacingPin(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title={t.common_cancel}
          >
            &times;
          </button>
        )
      ) : (
        onStartPlacingPin && (
          <button
            className={styles.addPinBtn}
            onClick={(e) => { e.stopPropagation(); onStartPlacingPin(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            title={t.map_pin_add}
          >
            <MapPin size={20} />
          </button>
        )
      )}
      <div
        className={styles.surface}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {normalizedName && !imgError ? (
          <img
            className={styles.mapImage}
            src={mapImageUrl}
            alt={normalizedName}
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            {t.map_no_pins}
          </div>
        )}
        {/* ユーザーピン描画 */}
        {userPins.map((pin) => {
          const shape = pin.shape ?? 'circle';
          const isDragging = draggingPinId === pin.id;
          const pinX = isDragging && dragPos ? dragPos.x : pin.x;
          const pinY = isDragging && dragPos ? dragPos.y : pin.y;
          return (
            <div
              key={pin.id}
              className={`${styles.pinWrap} ${isDragging ? styles.pinDragging : ''}`}
              style={{
                left: `${pinX}%`,
                top: `${pinY}%`,
                opacity: pinOpacity,
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => { e.stopPropagation(); handlePinPointerDown(e.clientX, e.clientY, pin); }}
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  e.stopPropagation();
                  handlePinPointerDown(e.touches[0].clientX, e.touches[0].clientY, pin);
                }
              }}
              onMouseEnter={() => !draggingPinId && setHoveredPinId(pin.id)}
              onMouseLeave={() => setHoveredPinId(null)}
            >
              <div
                className={`${styles.userPin} ${SHAPE_CLASS[shape] ?? ''}`}
                style={{
                  ['--pin-color' as string]: PIN_COLORS[pin.color] ?? PIN_COLORS.white,
                  ['--marker-h' as string]: `${pinSize}px`,
                  width: `${pinSize}px`,
                  height: `${pinSize}px`,
                }}
              />
              {!isDragging && (showLabels || hoveredPinId === pin.id) && pin.label && (
                <div className={styles.tooltip}>
                  {pin.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ミニマップ */}
      {showMinimap && normalizedName && !imgError && (
        <div
          className={styles.minimap}
          style={{ width: MINIMAP_WIDTH, height: minimapHeight }}
          onClick={handleMinimapClick}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <img
            className={styles.minimapImage}
            src={mapImageUrl}
            alt=""
            draggable={false}
          />
          <div
            className={styles.minimapViewport}
            style={{
              left: `${mmVpLeft}%`,
              top: `${mmVpTop}%`,
              width: `${mmVpWidth}%`,
              height: `${mmVpHeight}%`,
            }}
          />
        </div>
      )}

      {/* PinEditPopover */}
      {editingPin && popoverPosition && (
        <PinEditPopover
          pin={editingPin.pin}
          position={popoverPosition}
          onSave={onEditSave}
          onDelete={editingPin.pin ? onEditDelete : undefined}
          onCancel={onEditCancel}
        />
      )}
    </div>
  );
});
