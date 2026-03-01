import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { TasksPage } from './components/tasks/TasksPage';
import { MapPage } from './components/map/MapPage';
import { HideoutPage } from './components/hideout/HideoutPage';
import { ItemsPage } from './components/items/ItemsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ShareImportPage } from './components/share/ShareImportPage';
import { PinPresetImportPage } from './components/map/PinPresetImportPage';
import { useAutoStart } from './hooks/useAutoStart';

const queryClient = new QueryClient();

function AppRoutes() {
  useAutoStart();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share" element={<ShareImportPage />} />
        <Route path="/map/preset" element={<PinPresetImportPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/hideout" element={<HideoutPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AppRoutes />
      </QueryClientProvider>
    </HelmetProvider>
  );
}
