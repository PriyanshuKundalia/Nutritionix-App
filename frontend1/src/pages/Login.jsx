import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, authToken, isLoading: authIsLoading } = useContext(AuthContext); 
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authIsLoading && authToken) {
      navigate('/dashboard');
    }
  }, [authToken, authIsLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting login for:', email);
      
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login API response received');

      if (!response.ok) {
        throw new Error(data.error || `Login failed with status: ${response.status}`);
      }

      if (!data.token) {
        throw new Error('No token received from server');
      }

      // Login successful - directly call login function
      console.log('Token received, calling login function...');
      login(data.token); // Don't check return value, just call it
      
      console.log('Login function called, redirecting to dashboard...');
      navigate('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Login</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p>
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>

      <style jsx>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #1a1a1a;
          padding: 20px;
        }
        
        .login-form {
          background: #2d2d2d;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          width: 100%;
          max-width: 400px;
          color: white;
        }
        
        h1 {
          text-align: center;
          color: #66d7ff;
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          color: #ccc;
          font-weight: 500;
        }
        
        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #555;
          border-radius: 5px;
          background: #1a1a1a;
          color: white;
          font-size: 16px;
          box-sizing: border-box;
        }
        
        input:focus {
          outline: none;
          border-color: #66d7ff;
          box-shadow: 0 0 0 2px rgba(102, 215, 255, 0.2);
        }
        
        input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(90deg, #39d6c0, #66d7ff);
          border: none;
          border-radius: 5px;
          color: #001214;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-message {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        p {
          text-align: center;
          margin-top: 20px;
          color: #ccc;
        }
        
        a {
          color: #66d7ff;
          text-decoration: none;
        }
        
        a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}