import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './AuthProvider';
import RequireAuth from './RequireAuth';
import RoomPage from './pages/RoomPage';
import RoomsLayout from './pages/RoomsLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<RoomsLayout />}>
              <Route index element={<p className="muted">Select a room or create a new one.</p>} />
              <Route path="rooms/:roomId" element={<RoomPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
