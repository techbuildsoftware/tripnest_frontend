import { createContext, useContext, useState } from "react";

// Demo-only auth (localStorage). Swap the bodies of login/signup for your real API calls.
const AuthCtx = createContext(null);
const KEY = "tripnest_user";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(read);
  const save = (u) => { setUser(u); try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {} };
  const value = {
    user,
    login: async ({ email, type }) => { await new Promise((r) => setTimeout(r, 900)); save({ name: email.split("@")[0], email, type: type || "traveller" }); },
    signup: async (data) => { await new Promise((r) => setTimeout(r, 1100)); save({ name: data.name, email: data.email, type: data.type, company: data.company }); },
    logout: () => { setUser(null); try { localStorage.removeItem(KEY); } catch {} },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
