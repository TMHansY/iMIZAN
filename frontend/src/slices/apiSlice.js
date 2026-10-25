import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';
import { logout, refreshSession } from './authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_BACKEND_URL,
  credentials: 'include',
});

const baseQueryWithSession = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  const sessionExpiresAt = result.meta?.response?.headers.get('X-Session-Expires-At');

  if (sessionExpiresAt) {
    api.dispatch(refreshSession(sessionExpiresAt));
  }

  if (result.error?.status === 401) {
    api.dispatch(logout());
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithSession,

  tagTypes: ['User'],
  refetchOnMountOrArgChange: true,
  endpoints: (builder) => ({}),
});
