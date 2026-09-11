import { Toasty } from "@cloudflare/kumo/components/toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./app/auth/AuthProvider";
import { RequireAdmin } from "./app/RequireAdmin";
import { LoginPage } from "./features/auth/LoginPage";
import { DevicesPage } from "./features/devices/DevicesPage";
import { PublicHomePage } from "./features/public/HomePage";
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
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAdmin />}>
              <Route element={<AppShell />}>
                <Route path="/admin" element={<DevicesPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/devices/:deviceId" element={<ConsolePage />} />
                <Route path="/admin/devices/:deviceId/pair" element={<PairPage />} />
                <Route path="/admin/devices/:deviceId/waves" element={<WavesPage />} />
                <Route path="/admin/devices/:deviceId/records" element={<RecordsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </Toasty>
  );
}
