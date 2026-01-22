import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem('token'));

  // Re-check token on route change
  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    navigate('/admin/login');
  };

  return (
    <nav className="bg-white/90 backdrop-blur shadow-brand sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">

          {/* Logo (UNCHANGED) */}
          <Link
            to={token ? "/dashboard" : "/admin/login"}
            className="flex items-center text-2xl font-bold text-brand-primary"
          >
            <img src="/logo.png" alt="Logo" className="h-16 w-32 mr-2" />
          </Link>

          {/* Navigation (UNCHANGED STYLE) */}
          <div className="flex items-center space-x-2 text-sm font-medium">
            {token ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-slate-600 hover:text-brand-primary px-3 py-2"
                >
                  Dashboard
                </Link>

                <Link
                  to="/create-test"
                  className="text-slate-600 hover:text-brand-primary px-3 py-2"
                >
                  Create Test
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-brand-primary text-white rounded px-4 py-2 hover:bg-brand-secondary shadow-card transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/admin/login"
                  className="text-slate-600 hover:text-brand-primary px-3 py-2"
                >
                  Login
                </Link>

                <Link
                  to="/admin/signup"
                  className="bg-brand-gradient text-white rounded px-4 py-2 shadow-brand hover:shadow-lg transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
