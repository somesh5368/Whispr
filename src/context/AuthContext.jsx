// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getStoredAuth } from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(() => getStoredAuth());

  const token = authData?.token || authData?.user?.token || null;
  const user = authData?.user || authData || null;

  const login = useCallback((data) => {
    try {
      const normalized = {
        ...data,
        user: data?.user ? { ...data.user, id: data.user.id || data.user._id } : data,
        token: data?.token || data?.user?.token,
      };
      localStorage.setItem('user', JSON.stringify(normalized));
      setAuthData(normalized);
    } catch (err) {
      console.error('Failed to save user session:', err);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch (err) {
      console.error('Failed to clear user session:', err);
    }
    setAuthData(null);
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setAuthData((prev) => {
      const currentAuth = prev || getStoredAuth() || {};
      const currentUserObj = currentAuth.user || currentAuth || {};
      const mergedUser = {
        ...currentUserObj,
        ...updatedUserData,
        id: updatedUserData.id || updatedUserData._id || currentUserObj.id || currentUserObj._id,
      };
      const updatedAuth = {
        ...currentAuth,
        user: mergedUser,
        token: currentAuth.token || updatedUserData.token,
      };
      try {
        localStorage.setItem('user', JSON.stringify(updatedAuth));
      } catch (err) {
        console.error('Failed to update user session:', err);
      }
      return updatedAuth;
    });
  }, []);

  const value = useMemo(
    () => ({
      auth: authData,
      user,
      token,
      currentUser: user,
      login,
      logout,
      updateUser,
    }),
    [authData, user, token, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
