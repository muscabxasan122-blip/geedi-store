import { createContext, useContext, useState, type ReactNode } from "react";
import { api } from "./api";

export type Role = "ADMINISTRATOR" | "SALESMAN" | "INVENTORY_MANAGER";
export type User = { id: number; fullName: string; username: string; role: Role };

type AuthCtx = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "null");
    } catch {
      return null;
    }
  });

  async function login(username: string, password: string) {
    const res = await api("/api/auth/login", { method: "POST", body: { username, password } });
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}