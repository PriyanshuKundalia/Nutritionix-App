import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on app start
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken && savedToken !== 'null' && savedToken !== 'undefined') {
      setAuthToken(savedToken);
      console.log('Token loaded from localStorage:', savedToken.substring(0, 20) + '...');
    } else {
      console.log('No valid token found in localStorage');
    }
    setIsLoading(false);
  }, []);

  const login = (token) => {
    console.log('Login function called with token:', token ? token.substring(0, 20) + '...' : 'null');
    
    // Simple validation - just check if token exists and is a string
    if (token && typeof token === 'string') {
      console.log('Token validation passed, setting authToken...');
      setAuthToken(token);
      localStorage.setItem('token', token);
      console.log('Token saved to localStorage and state updated');
      return true;
    } else {
      console.error('Invalid token provided to login function:', token);
      return false;
    }
  };

  const logout = () => {
    console.log('Logout function called');
    setAuthToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = () => {
    return authToken !== null && authToken !== undefined;
  };

  const value = {
    authToken,
    login,
    logout,
    isAuthenticated,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;