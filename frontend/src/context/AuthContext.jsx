import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const { data } = await axios.get('/auth/me');
          setUser(data.data);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    validateToken();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await axios.post('/auth/login', { email, password });
    const nextToken = data?.token;
    const nextUser = data?.user;

    if (!nextToken || !nextUser) {
      const message =
        data?.message ||
        'Login failed: invalid server response (missing token/user). Check API base URL and proxy settings.';
      throw new Error(message);
    }

    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser({ ...user, ...userData });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
