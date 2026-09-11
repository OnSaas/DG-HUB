import { Toaster } from "sonner";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./app/auth/AuthProvider";
import { RequireAdmin } from "./app/RequireAdmin";
import { LoginPage } from "./features/auth/LoginPage";
import { McpPage } from "./features/mcp/McpPage";
import { DeviceSettingsPage } from "./features/devices/DeviceSettingsPage";
import { DevicesPage } from "./features/devices/DevicesPage";
import { PublicHomePage } from "./features/public/HomePage";
import { SharePage } from "./features/shares/SharePage";
import { AppShell } from "./layout/AppShell";
import { ConsolePage } from "./pages/ConsolePage";
import { PairPage } from "./pages/PairPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WavesPage } from "./pages/WavesPage";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";

function LoginAlias() {
  const { search } = useLocation();
  return <Navigate to={`/admin/login${search}`} replace />;
}

function DevicesAlias() {
  const { pathname, search } = useLocation();
  const rest = pathname.replace(/^\/devices/, "") || "";
  return <Navigate to={`/admin/devices${rest}${search}`} replace />;
}

function ThemedToaster() {
  const { theme } = useTheme();
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  return <Toaster theme={dark ? "dark" : "light"} richColors position="top-right" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ThemedToaster />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/share/:token" element={<SharePage />} />
            <Route path="/login" element={<LoginAlias />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/devices" element={<DevicesAlias />} />
            <Route path="/devices/*" element={<DevicesAlias />} />
            <Route element={<RequireAdmin />}>
              <Route element={<AppShell />}>
                <Route path="/admin" element={<Navigate to="/admin/devices" replace />} />
                <Route path="/admin/devices" element={<DevicesPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/mcp" element={<McpPage />} />
                <Route path="/admin/devices/:deviceId" element={<ConsolePage />} />
                <Route path="/admin/devices/:deviceId/pair" element={<PairPage />} />
                <Route path="/admin/devices/:deviceId/waves" element={<WavesPage />} />
                <Route path="/admin/devices/:deviceId/records" element={<RecordsPage />} />
                <Route path="/admin/devices/:deviceId/settings" element={<DeviceSettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<PublicHomePage />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
