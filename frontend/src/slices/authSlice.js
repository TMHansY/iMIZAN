import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  //check if userInfo present in session storage use it else null
  userInfo: sessionStorage.getItem('userInfo') ? JSON.parse(sessionStorage.getItem('userInfo')) : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // set  userinfo in local storage
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      sessionStorage.setItem('userInfo', JSON.stringify(action.payload));
    },
    // clear local storage it different from actual logout which send to backend
    // it just clear credential form local storage it like frontend logout
    logout: (state, action) => {
      state.userInfo = null;
      sessionStorage.removeItem('userInfo');
    },
  },
});

// export actions
export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
