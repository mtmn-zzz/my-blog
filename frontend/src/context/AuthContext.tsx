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
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser(token)
      .then(setUser)
      .catch(() => setStoredToken(null))
      .finally(() => setLoading(false));
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
