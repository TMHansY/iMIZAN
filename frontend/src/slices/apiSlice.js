import { fetchBaseQuery, createApi } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_BACKEND_URL,
    credentials: 'include',
  }),

  tagTypes: ['User'],
  refetchOnMountOrArgChange: true,
  endpoints: (builder) => ({}),
});
