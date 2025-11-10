// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RelatoriosPage from './pages/RelatoriosPage';
import RelatorioDetalhadoPage from './pages/RelatorioDetalhadoPage';
import AnalysisDashboard from './components/AnalysisDashboard';
import ProfessorDashboard from './components/ProfessorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const DashboardSelector = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  return <AnalysisDashboard />;
};

const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardSelector />} />
        <Route path="professor" element={<ProfessorDashboard />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="relatorios/:id" element={<RelatorioDetalhadoPage />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
