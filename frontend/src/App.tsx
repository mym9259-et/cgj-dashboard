import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import FunnelPage from "./pages/FunnelPage";
import OrdersPage from "./pages/OrdersPage";
import PerformancePage from "./pages/PerformancePage";
import PerformanceDetail from "./pages/PerformanceDetail";
import ComparePage from "./pages/ComparePage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/funnel" element={<FunnelPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/performance/:name" element={<PerformanceDetail />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </AppLayout>
  );
}
