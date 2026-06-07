import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProfileUpdate, User } from "../api/auth-types";
import {
  changePassword as changePasswordApi,
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  registerUser,
  setStoredToken,
  updateProfile,
  uploadAvatar as uploadAvatarApi,
} from "../api/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  updateUser: (data: ProfileUpdate) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // OAuth 回调页会写入新 token，跳过旧 token 校验，避免竞态把新 token 清掉
    const params = new URLSearchParams(window.location.search);
    if (
      window.location.pathname === "/auth/github/callback" &&
      (params.has("token") || params.has("error"))
    ) {
      setLoading(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchCurrentUser(token)
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(() => {
        if (!cancelled) setStoredToken(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginUser({ username, password });
    setStoredToken(data.access_token);
    setUser(data.user);
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    setStoredToken(token);
    const currentUser = await fetchCurrentUser(token);
    setUser(currentUser);
  }, []);

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      await registerUser({ username, password, email: email || undefined });
      await login(username, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (data: ProfileUpdate) => {
    const token = getStoredToken();
    if (!token) throw new Error("未登录");
    const updated = await updateProfile(token, data);
    setUser(updated);
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const token = getStoredToken();
    if (!token) throw new Error("未登录");
    const updated = await uploadAvatarApi(token, file);
    setUser(updated);
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    const token = getStoredToken();
    if (!token) throw new Error("未登录");
    await changePasswordApi(token, {
      old_password: oldPassword,
      new_password: newPassword,
    });
    const updated = await fetchCurrentUser(token);
    setUser(updated);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginWithToken, register, updateUser, uploadAvatar, changePassword, logout }),
    [user, loading, login, loginWithToken, register, updateUser, uploadAvatar, changePassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
