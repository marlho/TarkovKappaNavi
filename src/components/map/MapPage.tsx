import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useMemo, useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { useMaps } from '../../api/hooks';
import { useMapPins } from '../../hooks/useMapPins';
import { useProfileStore } from '../../stores/profileStore';
import { useT } from '../../i18n';
import { Skeleton } from '../ui/Skeleton';
import { BottomSheet } from '../ui/BottomSheet';
import { MapSelector } from './MapSelector';
import { MapCanvas, MAP_IMAGE_ALIAS, MAPS_2D_ONLY } from './MapCanvas';
import type { MapCanvasHandle, EditingPin } from './MapCanvas';
import { MapInfoBar } from './MapInfoBar';
import { PinListPanel } from './PinListPanel';
import type { MapPinRow, PinColor, PinShape } from '../../db/types';
import styles from './MapPage.module.css';
import { MapPin } from 'lucide-react';

const HIDDEN_MAP_VARIANTS = new Set([
  'night-factory',
  'ground-zero-21',
  'ground-zero-tutorial',
]);

const LS_KEY_LAST_MAP = 'tarkov-kappa-last-map-id';
const LS_KEY_VIEW_MODE = 'tarkov-kappa-map-view-mode';
const LS_KEY_PIN_OPACITY = 'tarkov-kappa-map-pin-opacity';
const LS_KEY_PIN_SIZE = 'tarkov-kappa-map-pin-size';
const LS_KEY_SHOW_LABELS = 'tarkov-kappa-map-show-labels';
const LS_KEY_PANEL_WIDTH = 'tarkov-kappa-map-panel-width';
const DEFAULT_PANEL_WIDTH = 280;
const MIN_PANEL_WIDTH = 180;
const MAX_PANEL_WIDTH = 500;

export function MapPage() {
  const t = useT();
  const { data: maps, isLoading: mapsLoading } = useMaps();
  const wipeId = useProfileStore((s) => s.wipeId);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(
    () => localStorage.getItem(LS_KEY_LAST_MAP),
  );
  const [viewMode, setViewMode] = useState<'2d' | '3d'>(
    () => {
      const saved = localStorage.getItem(LS_KEY_VIEW_MODE);
      return saved === '2d' ? '2d' : '3d';
    },
  );
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [editingPin, setEditingPin] = useState<EditingPin | null>(null);
  const [pinOpacity, setPinOpacity] = useState(() => {
    const saved = localStorage.getItem(LS_KEY_PIN_OPACITY);
    return saved !== null ? parseFloat(saved) : 0.7;
  });
  const [pinSize, setPinSize] = useState(() => {
    const saved = localStorage.getItem(LS_KEY_PIN_SIZE);
    return saved !== null ? parseInt(saved, 10) : 22;
  });
  const [showLabels, setShowLabels] = useState(() => {
    const saved = localStorage.getItem(LS_KEY_SHOW_LABELS);
    return saved !== null ? saved === 'true' : true;
  });
  const canvasRef = useRef<MapCanvasHandle>(null);
  const editingPinRef = useRef(editingPin);
  editingPinRef.current = editingPin;

  // 右パネル幅リサイズ
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem(LS_KEY_PANEL_WIDTH);
    return saved !== null ? Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, parseInt(saved, 10))) : DEFAULT_PANEL_WIDTH;
  });
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_PANEL_WIDTH);

  useEffect(() => {
    localStorage.setItem(LS_KEY_PANEL_WIDTH, String(panelWidth));
  }, [panelWidth]);

  const handleResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [panelWidth]);

  const handleResizePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const delta = startXRef.current - e.clientX; // 左にドラッグ → パネル幅拡大
    const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidthRef.current + delta));
    setPanelWidth(newWidth);
  }, []);

  const handleResizePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // モバイルBottomSheet状態
  const [showInfo, setShowInfo] = useState(false);
  const [showPinPanel, setShowPinPanel] = useState(false);

  const { pins, addPin, updatePin, deletePin } = useMapPins(selectedMapId, wipeId, viewMode);

  const visibleMaps = useMemo(
    () => (maps ?? []).filter((m) => !HIDDEN_MAP_VARIANTS.has(m.normalizedName)),
    [maps],
  );

  const selectedMap = useMemo(() => {
    if (!maps || !selectedMapId) return null;
    return maps.find((m) => m.id === selectedMapId) ?? null;
  }, [maps, selectedMapId]);

  // 選択変更時にlocalStorageへ保存
  useEffect(() => {
    if (selectedMapId) {
      localStorage.setItem(LS_KEY_LAST_MAP, selectedMapId);
    }
  }, [selectedMapId]);

  // 表示モード変更時にlocalStorageへ保存
  useEffect(() => {
    localStorage.setItem(LS_KEY_VIEW_MODE, viewMode);
  }, [viewMode]);

  // ピン設定変更時にlocalStorageへ保存
  useEffect(() => {
    localStorage.setItem(LS_KEY_PIN_OPACITY, String(pinOpacity));
  }, [pinOpacity]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_PIN_SIZE, String(pinSize));
  }, [pinSize]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_SHOW_LABELS, String(showLabels));
  }, [showLabels]);

  // 復元したmapIdがAPI一覧に存在しなければクリア
  useEffect(() => {
    if (!maps || !selectedMapId) return;
    const exists = maps.some((m) => m.id === selectedMapId);
    if (!exists) {
      setSelectedMapId(null);
      localStorage.removeItem(LS_KEY_LAST_MAP);
    }
  }, [maps]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3D画像がないマップを選んだら自動的に2Dに切り替え
  useEffect(() => {
    if (!selectedMap) return;
    const imgName = MAP_IMAGE_ALIAS[selectedMap.normalizedName] ?? selectedMap.normalizedName;
    if (MAPS_2D_ONLY.has(imgName) && viewMode === '3d') {
      setViewMode('2d');
    }
  }, [selectedMapId]); // eslint-disable-line react-hooks/exhaustive-deps

  // マップ変更時にピン配置モードとBottomSheetをリセット
  useEffect(() => {
    setIsPlacingPin(false);
    setEditingPin(null);
    setShowInfo(false);
    setShowPinPanel(false);
  }, [selectedMapId]);

  const handleAddClick = useCallback(() => {
    setShowPinPanel(false);
    setIsPlacingPin(true);
    setEditingPin(null);
  }, []);

  const handleCancelPlacing = useCallback(() => {
    setIsPlacingPin(false);
  }, []);

  const handleMapClick = useCallback((xPct: number, yPct: number) => {
    setEditingPin({ x: xPct, y: yPct });
    setIsPlacingPin(false);
  }, []);

  const handleEditSave = useCallback(async (label: string, color: PinColor, shape: PinShape) => {
    const ep = editingPinRef.current;
    if (!ep) return;
    if (ep.pin) {
      await updatePin(ep.pin.id, { label, color, shape });
    } else {
      await addPin(ep.x, ep.y, label, color, shape);
    }
    setEditingPin(null);
  }, [addPin, updatePin]);

  const handleEditCancel = useCallback(() => {
    setEditingPin(null);
  }, []);

  const handleEditDelete = useCallback(async () => {
    if (editingPin?.pin) {
      await deletePin(editingPin.pin.id);
    }
    setEditingPin(null);
  }, [editingPin, deletePin]);

  const handlePinClick = useCallback((pin: MapPinRow) => {
    canvasRef.current?.zoomToPoint(pin.x, pin.y);
  }, []);

  const handlePinEdit = useCallback((pin: MapPinRow) => {
    setEditingPin({ pin, x: pin.x, y: pin.y });
    setIsPlacingPin(false);
  }, []);

  const handlePinDelete = useCallback(async (pin: MapPinRow) => {
    await deletePin(pin.id);
  }, [deletePin]);

  const handleUserPinClick = useCallback((pin: MapPinRow) => {
    setEditingPin({ pin, x: pin.x, y: pin.y });
    setIsPlacingPin(false);
  }, []);

  const handlePinDragEnd = useCallback(async (pinId: string, xPct: number, yPct: number) => {
    await updatePin(pinId, { x: xPct, y: yPct });
  }, [updatePin]);

  // BottomSheet閉じる時に配置モードをリセット
  const handleCloseInfo = useCallback(() => {
    setShowInfo(false);
  }, []);

  const handleClosePinPanel = useCallback(() => {
    setShowPinPanel(false);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setShowInfo((v) => !v);
    setShowPinPanel(false);
  }, []);

  const handleTogglePinPanel = useCallback(() => {
    setShowPinPanel((v) => !v);
    setShowInfo(false);
    setIsPlacingPin(false);
    setEditingPin(null);
  }, []);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{t.map_meta_title}</title>
        <meta name="description" content={t.map_meta_desc} />
      </Helmet>
      <h1 className={styles.pageTitle}>{t.map_page_title}</h1>

      {mapsLoading ? (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} width="90px" height="36px" borderRadius="4px" />
            ))}
          </div>
          <Skeleton height="400px" borderRadius="6px" />
        </>
      ) : (
        <>
      <div className={styles.mapSelectorArea}>
        <MapSelector
          maps={visibleMaps}
          selectedMapId={selectedMapId}
          onSelect={setSelectedMapId}
        />
      </div>

      {/* デスクトップ用InfoBar */}
      {selectedMap && (
        <div className={styles.desktopInfoBar}>
          <MapInfoBar map={selectedMap} />
        </div>
      )}

      {selectedMapId && (
        <div className={styles.content}>
          <div className={styles.canvasWrapper}>
            <MapCanvas
              ref={canvasRef}
              mapId={selectedMapId}
              normalizedName={selectedMap?.normalizedName}
              userPins={pins}
              isPlacingPin={isPlacingPin}
              editingPin={editingPin}
              onMapClick={handleMapClick}
              onUserPinClick={handleUserPinClick}
              onEditSave={handleEditSave}
              onEditCancel={handleEditCancel}
              onEditDelete={handleEditDelete}
              onPinDragEnd={handlePinDragEnd}
              onStartPlacingPin={handleAddClick}
              onCancelPlacingPin={handleCancelPlacing}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              pinOpacity={pinOpacity}
              pinSize={pinSize}
              showLabels={showLabels}
            />
          </div>
          <div
            className={styles.resizeHandle}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
          />
          <div className={styles.pinListWrapper} style={{ width: panelWidth, maxWidth: panelWidth }}>
            <PinListPanel
              pins={pins}
              onAddClick={handleAddClick}
              onPinClick={handlePinClick}
              onPinEdit={handlePinEdit}
              onPinDelete={handlePinDelete}
              pinOpacity={pinOpacity}
              onPinOpacityChange={setPinOpacity}
              pinSize={pinSize}
              onPinSizeChange={setPinSize}
              showLabels={showLabels}
              onShowLabelsChange={setShowLabels}
            />
          </div>
        </div>
      )}

      {/* モバイルFABボタン群 */}
      {selectedMapId && (
        <div className={styles.mobileFabs}>
          <button
            className={`${styles.fab} ${showInfo ? styles.fabActive : ''}`}
            onClick={handleToggleInfo}
            aria-label={t.map_info_toggle}
          >
            &#x2139;&#xFE0E;
          </button>
          <button
            className={`${styles.fab} ${showPinPanel ? styles.fabActive : ''}`}
            onClick={handleTogglePinPanel}
            aria-label={t.map_pins_toggle}
          >
            <MapPin size={32} />
          </button>
        </div>
      )}

      {/* モバイルBottomSheet: マップ情報 */}
      {selectedMap && (
        <BottomSheet open={showInfo} onClose={handleCloseInfo} title={t.map_info_toggle}>
          <MapInfoBar map={selectedMap} />
        </BottomSheet>
      )}

      {/* モバイルBottomSheet: ピン管理 */}
      {selectedMapId && (
        <BottomSheet open={showPinPanel} onClose={handleClosePinPanel} title={t.map_pins_toggle}>
          <PinListPanel
            pins={pins}
            onAddClick={handleAddClick}
            onPinClick={handlePinClick}
            onPinEdit={handlePinEdit}
            onPinDelete={handlePinDelete}
            pinOpacity={pinOpacity}
            onPinOpacityChange={setPinOpacity}
            pinSize={pinSize}
            onPinSizeChange={setPinSize}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
          />
        </BottomSheet>
      )}
        </>
      )}
    </div>
  );
}
