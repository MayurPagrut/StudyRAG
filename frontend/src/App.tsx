import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from './components/Spinner';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import AdminDocuments from './pages/AdminDocuments';
import AdminLayout from './pages/AdminLayout';
import ChatLayout from './pages/ChatLayout';
import ChatView from './pages/ChatView';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { homeFor, ProtectedRoute } from './routes/ProtectedRoute';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-full place-items-center"><Spinner label="Loading your session" /></div>;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<ChatLayout />}>
              <Route index element={<ChatView />} />
              <Route path="chat/:conversationId" element={<ChatView />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="documents" element={<AdminDocuments />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
