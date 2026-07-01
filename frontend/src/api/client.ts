import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  timeout: 300000,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url || "").includes("/auth/login")) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    const msg = error.response?.data?.message || error.message || "请求失败";
    console.error("API Error:", msg);
    return Promise.reject(error);
  }
);

export default apiClient;
