import { Navigate, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./contexts/AuthContext";

const ComparePage = lazy(() => import("./pages/ComparePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MappingPage = lazy(() => import("./pages/MappingPage"));
const StoreAnalysisPage = lazy(() => import("./pages/StoreAnalysisPage"));
const StoreOverviewPage = lazy(() => import("./pages/StoreOverviewPage"));
const PeopleAnalysisPage = lazy(() => import("./pages/PeopleAnalysisPage"));
const IndividualAnalysisPage = lazy(() => import("./pages/IndividualAnalysisPage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));

const routeFallback = <Spin size="large" style={{ display: "block", margin: "30vh auto" }} />;

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
    return routeFallback;
  }

  if (!user) {
    return (
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </Suspense>
  );
}
