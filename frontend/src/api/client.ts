import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  timeout: 300000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || error.message || "请求失败";
    console.error("API Error:", msg);
    return Promise.reject(error);
  }
);

export default apiClient;
