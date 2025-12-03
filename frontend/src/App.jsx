import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import CreateTestPage from './components/CreateTestPage.jsx';
import TestPage from './components/TestPage.jsx';
import ResultsPage from './components/ResultsPage.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Navbar from './components/Navbar.jsx';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/test/share/:shareLink" element={<TestPage />} />
          <Route path="/test/:testId" element={<TestPage />} />

          {/* Private Admin Routes */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/create-test" element={<PrivateRoute><CreateTestPage /></PrivateRoute>} />
          <Route path="/edit-test/:testId" element={<PrivateRoute><CreateTestPage /></PrivateRoute>} />
          <Route path="/results/:testId" element={<PrivateRoute><ResultsPage /></PrivateRoute>} />

          <Route path="/" element={<LoginPage />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;