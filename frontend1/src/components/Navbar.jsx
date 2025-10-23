import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Navbar() {
  const { authToken, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav
      style={{
        width: '100%',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 100,
        background: 'linear-gradient(90deg, #232526, #363636)',
        boxShadow: '0 2px 8px rgba(44,62,80,0.09)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 0 10px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '26px',
          alignItems: 'center',
          fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
          fontSize: '1.13rem',
        }}
      >
        <NavLink to="/" text="Home" />
        <NavLink to="/about" text="About" />
        {authToken ? (
          <>
            <NavLink to="/dashboard" text="Dashboard" />
            <NavLink to="/profile" text="Profile" />
            <NavLink to="/mealplanner" text="Meal Planner" />
            <NavLink to="/workoutplanner" text="Workout Planner" />
            <NavLink to="/goals" text="Goals" />
            <button
              onClick={handleLogout}
              style={{
                marginLeft: '15px',
                padding: '8px 19px',
                borderRadius: '5px',
                background: '#2ecc71',
                color: '#fff',
                fontWeight: '600',
                border: 'none',
                boxShadow: '0 1px 5px rgba(46,204,113,0.12)',
                cursor: 'pointer',
                transition: 'background 0.24s, color 0.24s',
              }}
              onMouseEnter={e => (e.target.style.background = '#27ae60')}
              onMouseLeave={e => (e.target.style.background = '#2ecc71')}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" text="Login" />
            <NavLink to="/register" text="Register" />
          </>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, text }) {
  return (
    <Link
      to={to}
      style={{
        color: '#34b3a0',
        textDecoration: 'none',
        fontWeight: '600',
        padding: '5px 12px',
        borderRadius: '4px',
        transition: 'background 0.2s, color 0.2s',
      }}
      onMouseEnter={e => {
        e.target.style.background = '#262626';
        e.target.style.color = '#2ecc71';
      }}
      onMouseLeave={e => {
        e.target.style.background = '';
        e.target.style.color = '#34b3a0';
      }}
    >
      {text}
    </Link>
  );
}

