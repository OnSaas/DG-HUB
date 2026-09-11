import { Toasty } from "@cloudflare/kumo/components/toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./app/auth/AuthProvider";
import { LegacyAdminRedirect } from "./app/LegacyAdminRedirect";
import { LoginPage } from "./features/auth/LoginPage";
import { DeviceSettingsPage } from "./features/devices/DeviceSettingsPage";
import { DevicesPage } from "./features/devices/DevicesPage";
import { SharePage } from "./features/shares/SharePage";
import { AppShell } from "./layout/AppShell";
import { ConsolePage } from "./pages/ConsolePage";
import { PairPage } from "./pages/PairPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WavesPage } from "./pages/WavesPage";

export default function App() {
  return (
    <Toasty>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/share/:token" element={<SharePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<Navigate to="/devices" replace />} />
            <Route path="/admin/*" element={<LegacyAdminRedirect />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<DevicesPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/console" element={<ConsolePage />} />
              <Route path="/pair" element={<PairPage />} />
              <Route path="/waves" element={<WavesPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/devices/:deviceId" element={<ConsolePage />} />
              <Route path="/devices/:deviceId/pair" element={<PairPage />} />
              <Route path="/devices/:deviceId/waves" element={<WavesPage />} />
              <Route path="/devices/:deviceId/records" element={<RecordsPage />} />
              <Route path="/devices/:deviceId/settings" element={<DeviceSettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/devices" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Toasty>
  );
}
