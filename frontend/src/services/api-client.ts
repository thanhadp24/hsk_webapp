import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const accessToken = window.localStorage.getItem("hsk_access_token");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const refreshToken = window.localStorage.getItem("hsk_refresh_token");
    const isLoginRequest = originalRequest?.url?.includes("/auth/login/");
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh/");

    if (
      error.response?.status === 401 &&
      refreshToken &&
      !originalRequest?._retry &&
      !isLoginRequest &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh/`,
          { refresh: refreshToken },
        );
        const access = response.data.access as string;
        window.localStorage.setItem("hsk_access_token", access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch {
        window.localStorage.removeItem("hsk_access_token");
        window.localStorage.removeItem("hsk_refresh_token");
      }
    }

    return Promise.reject(error);
  },
);
