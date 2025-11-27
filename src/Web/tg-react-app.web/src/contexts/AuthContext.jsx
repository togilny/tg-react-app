import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, register as registerApi } from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const userId = localStorage.getItem('userId');

    if (token && username && userId) {
      setUser({ username, userId, token });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const response = await loginApi(username, password);
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('username', response.username);
    localStorage.setItem('userId', response.userId);
    setUser({ username: response.username, userId: response.userId, token: response.token });
  }, []);

  const register = useCallback(async (username, password) => {
    const response = await registerApi(username, password);
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('username', response.username);
    localStorage.setItem('userId', response.userId);
    setUser({ username: response.username, userId: response.userId, token: response.token });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

