import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/Profile";
import EligibilityPage from "./pages/Eligibility";
import OpportunitiesPage from "./pages/Opportunities";
import SimulatorPage from "./pages/Simulator";
import AdvisorWizard from "./pages/AdvisorWizard";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/advisor" replace />} />
        <Route path="advisor" element={<AdvisorWizard />} />
        <Route path="assess" element={<DashboardPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="eligibility" element={<EligibilityPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/advisor" replace />} />
    </Routes>
  );
}
