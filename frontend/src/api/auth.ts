import apiClient from "./client";

export type AuthUser = {
  username: string;
  role: "admin" | "user";
};

export async function login(username: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post("/auth/login", { username, password });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function resetUserPassword(username: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/reset-password", {
    username,
    new_password: newPassword,
  });
}
