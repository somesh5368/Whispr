// src/utils/authStorage.js

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = () => {
  const data = getStoredAuth();
  return data?.token || data?.user?.token || null;
};

export const getStoredUser = () => {
  const data = getStoredAuth();
  return data?.user || data || null;
};
