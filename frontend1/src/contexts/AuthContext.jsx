import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(() => {
    // Initialize from localStorage once on mount
    return localStorage.getItem('authToken');
  });

  // Optional: Sync token to localStorage on authToken change
  useEffect(() => {
    if (authToken) {
      localStorage.setItem('authToken', authToken);
    } else {
      localStorage.removeItem('authToken');
    }
  }, [authToken]);

  function login(token) {
    setAuthToken(token);
    // localStorage set happens in useEffect
  }

  function logout() {
    setAuthToken(null);
    // localStorage remove happens in useEffect
  }

  return (
    <AuthContext.Provider value={{ authToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
