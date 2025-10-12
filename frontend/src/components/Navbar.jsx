import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to={token ? "/dashboard" : "/login"} className="text-2xl font-bold text-blue-600">
            OnlineTest
          </Link>
          <div>
            {token ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 px-3 py-2">Dashboard</Link>
                <Link to="/create-test" className="text-gray-600 hover:text-blue-600 px-3 py-2">Create Test</Link>
                <button onClick={handleLogout} className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 ml-4">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 px-3 py-2">Login</Link>
                <Link to="/signup" className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 ml-2">
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
