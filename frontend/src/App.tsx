import { Navigate, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./contexts/AuthContext";
import ComparePage from "./pages/ComparePage";
import DashboardPage from "./pages/DashboardPage";
import FunnelPage from "./pages/FunnelPage";
import LoginPage from "./pages/LoginPage";
import MappingPage from "./pages/MappingPage";
import OrdersPage from "./pages/OrdersPage";
import PerformanceDetail from "./pages/PerformanceDetail";
import PerformancePage from "./pages/PerformancePage";
import StoreAnalysisPage from "./pages/StoreAnalysisPage";
import TrendComparePage from "./pages/TrendComparePage";
import UploadPage from "./pages/UploadPage";

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/store-analysis" element={<StoreAnalysisPage />} />
        <Route path="/funnel" element={<FunnelPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/performance/:name" element={<PerformanceDetail />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/compare/trend" element={<TrendComparePage />} />
        <Route path="/mapping" element={<MappingPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spin size="large" style={{ display: "block", margin: "30vh auto" }} />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<ProtectedRoutes />} />
    </Routes>
  );
}
