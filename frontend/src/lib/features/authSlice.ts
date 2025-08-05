// store/slices/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type User = {
  id: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
};

type AuthState = {
  user: User | null;
};

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
    },
    login(state, action: PayloadAction<User>) {
      state.user = {
        ...action.payload,
        isLoggedIn: true,
      };
    },
  },
});

export const { setUser, logout, login } = authSlice.actions;
export default authSlice.reducer;
