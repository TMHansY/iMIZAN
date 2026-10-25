import { createSlice } from '@reduxjs/toolkit';

const storedUserInfo = sessionStorage.getItem('userInfo');
const storedSessionExpiry = sessionStorage.getItem('sessionExpiresAt');
const sessionIsValid =
  storedUserInfo &&
  storedSessionExpiry &&
  Number.isFinite(Date.parse(storedSessionExpiry)) &&
  Date.parse(storedSessionExpiry) > Date.now();

if (!sessionIsValid) {
  sessionStorage.removeItem('userInfo');
  sessionStorage.removeItem('sessionExpiresAt');
}

const initialState = {
  userInfo: sessionIsValid ? JSON.parse(storedUserInfo) : null,
  sessionExpiresAt: sessionIsValid ? storedSessionExpiry : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { sessionExpiresAt, ...userInfo } = action.payload;
      state.userInfo = userInfo;
      state.sessionExpiresAt = sessionExpiresAt || state.sessionExpiresAt;
      sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
      if (sessionExpiresAt) {
        sessionStorage.setItem('sessionExpiresAt', sessionExpiresAt);
      }
    },
    refreshSession: (state, action) => {
      state.sessionExpiresAt = action.payload;
      sessionStorage.setItem('sessionExpiresAt', action.payload);
    },
    logout: (state, action) => {
      state.userInfo = null;
      state.sessionExpiresAt = null;
      sessionStorage.removeItem('userInfo');
      sessionStorage.removeItem('sessionExpiresAt');
    },
  },
});

export const { setCredentials, refreshSession, logout } = authSlice.actions;

export default authSlice.reducer;
