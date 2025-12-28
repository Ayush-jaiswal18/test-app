import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate
} from 'react-router-dom';

import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import CreateTestPage from './components/CreateTestPage.jsx';
import TestPage from './components/TestPage.jsx';
import ResultsPage from './components/ResultsPage.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Navbar from './components/Navbar.jsx';

function App() {
  const location = useLocation();

  const hideNavbar = location.pathname.startsWith('/test');

  const centerLayout =
    location.pathname.startsWith('/test') ||
    location.pathname.startsWith('/create-test') ||
    location.pathname.startsWith('/edit-test') ||
    location.pathname.startsWith('/admin');

  return (
    <>
      {!hideNavbar && <Navbar />}

      <main
        className={
          centerLayout
            ? 'min-h-screen flex justify-center items-center bg-gray-100 px-4'
            : 'container mx-auto px-4 py-8'
        }
      >
        <Routes>
          {/* ===== PUBLIC ROUTES ===== */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/signup" element={<SignupPage />} />

          <Route path="/test/share/:shareLink" element={<TestPage />} />
          <Route path="/test/:testId" element={<TestPage />} />

          {/* ===== PRIVATE ADMIN ROUTES ===== */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/create-test"
            element={
              <PrivateRoute>
                <CreateTestPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/edit-test/:testId"
            element={
              <PrivateRoute>
                <CreateTestPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/results/:testId"
            element={
              <PrivateRoute>
                <ResultsPage />
              </PrivateRoute>
            }
          />

          {/* ===== DEFAULT ===== */}
          <Route path="/" element={<Navigate to="/admin/login" />} />
        </Routes>
      </main>
    </>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
