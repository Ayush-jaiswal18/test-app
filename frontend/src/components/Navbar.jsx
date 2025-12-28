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
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">

          {/* Logo (UNCHANGED) */}
          <Link
            to={token ? "/dashboard" : "/admin/login"}
            className="flex items-center text-2xl font-bold text-[#324158]"
          >
            <img src="/logo.png" alt="Logo" className="h-16 w-32 mr-2" />
          </Link>

          {/* Navigation (UNCHANGED STYLE) */}
          <div>
            {token ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-blue-600 px-3 py-2"
                >
                  Dashboard
                </Link>

                <Link
                  to="/create-test"
                  className="text-gray-600 hover:text-blue-600 px-3 py-2"
                >
                  Create Test
                </Link>

                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 ml-4"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/admin/login"
                  className="text-gray-600 hover:text-blue-600 px-3 py-2"
                >
                  Login
                </Link>

                <Link
                  to="/admin/signup"
                  className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 ml-2"
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
