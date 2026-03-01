import { useMemo, useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DetailDrawer } from './DetailDrawer';
import { ProgressOverlay } from './ProgressOverlay';
import { WelcomeModal } from '../onboarding/WelcomeModal';
import { TaskDetail } from '../detail/TaskDetail';
import { useDexieSync } from '../../hooks/useDexieSync';
import { useSelectionStore } from '../../stores/selectionStore';
import { useTasks, useMaps, useTraders, useHideoutStations, useItems } from '../../api/hooks';
import { useProgressMap } from '../../hooks/useProgressMap';
import { useProfileStore } from '../../stores/profileStore';
import { getTaskLockState } from '../../domain/unlock';
import styles from './AppShell.module.css';

export function AppShell() {
  const { ready: dbReady } = useDexieSync();
  const selectedTaskId = useSelectionStore((s) => s.selectedTaskId);
  const detailOpen = selectedTaskId !== null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const { data: taskData, isLoading: tasksLoading } = useTasks();
  // 全画面のデータをアプリ起動時にプリフェッチ（キャッシュに載せる）
  useMaps();
  useTraders();
  useHideoutStations();
  useItems();
  const { progressMap, loading: progressLoading, refresh } = useProgressMap();
  const playerLevel = useProfileStore((s) => s.currentLevel);

  const onboardingDone = useProfileStore((s) => s.onboardingDone);
  const isLoading = !dbReady || tasksLoading || progressLoading;

  // オーバーレイ制御
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayRemoved, setOverlayRemoved] = useState(false);

  const loadingStage: 'db' | 'api' | 'progress' | null =
    !dbReady ? 'db' : tasksLoading ? 'api' : progressLoading ? 'progress' : null;

  // データ準備完了時もオーバーレイを消す
  useEffect(() => {
    if (loadingStage === null && showOverlay) {
      setShowOverlay(false);
    }
  }, [loadingStage, showOverlay]);

  const overlayVisible = showOverlay && loadingStage !== null;

  // フェードアウト完了後にDOMから除去
  useEffect(() => {
    if (!showOverlay && !overlayRemoved) {
      const timer = setTimeout(() => setOverlayRemoved(true), 450);
      return () => clearTimeout(timer);
    }
  }, [showOverlay, overlayRemoved]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !taskData) return null;
    const quest = taskData.questMap.get(selectedTaskId);
    if (!quest) return null;
    const status = progressMap.get(selectedTaskId) ?? 'not_started';
    const lockState = getTaskLockState(quest, playerLevel, progressMap);
    return { quest, status, lockState };
  }, [selectedTaskId, taskData, progressMap, playerLevel]);

  return (
    <div className={styles.shell} data-detail-open={detailOpen || undefined} data-sidebar-collapsed={sidebarCollapsed || undefined}>
      <div className={styles.header}>
        <Header menuOpen={mobileMenuOpen} onMenuToggle={toggleMenu} onNavigate={closeMenu} />
      </div>
      <div className={styles.sidebar}>
        <Sidebar isLoading={isLoading} />
      </div>
      <button
        className={styles.sidebarToggle}
        onClick={() => setSidebarCollapsed((prev) => !prev)}
        aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
      <div
        className={styles.backdrop}
        data-visible={mobileMenuOpen || undefined}
        onClick={closeMenu}
      />
      <main className={styles.main}>
        <Outlet />
      </main>
      {detailOpen && (
        <div className={styles.detail}>
          <DetailDrawer open={detailOpen}>
            {selectedTask && taskData && (
              <TaskDetail
                quest={selectedTask.quest}
                status={selectedTask.status}
                lockState={selectedTask.lockState}
                taskData={taskData}
                progressMap={progressMap}
                onStatusChange={refresh}
              />
            )}
          </DetailDrawer>
        </div>
      )}
      {!overlayRemoved && (
        <ProgressOverlay
          stage={loadingStage ?? 'progress'}
          visible={overlayVisible}
          onComplete={() => setShowOverlay(false)}
        />
      )}
      {overlayRemoved && !onboardingDone && <WelcomeModal />}
    </div>
  );
}
