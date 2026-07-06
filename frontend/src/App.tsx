import { Navigate, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./contexts/AuthContext";
import ComparePage from "./pages/ComparePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MappingPage from "./pages/MappingPage";
import StoreAnalysisPage from "./pages/StoreAnalysisPage";
import StoreOverviewPage from "./pages/StoreOverviewPage";
import PeopleAnalysisPage from "./pages/PeopleAnalysisPage";
import IndividualAnalysisPage from "./pages/IndividualAnalysisPage";
import UploadPage from "./pages/UploadPage";

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/store-analysis" element={<StoreAnalysisPage />} />
        <Route path="/store-overview" element={<StoreOverviewPage />} />
        <Route path="/people-analysis" element={<PeopleAnalysisPage />} />
        <Route path="/people-analysis/individual" element={<IndividualAnalysisPage />} />
        <Route path="/compare" element={<ComparePage />} />
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
