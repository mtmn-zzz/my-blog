import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function GitHubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const err = params.get("error");
    const token = params.get("token")?.trim();
    if (err) {
      setError(decodeURIComponent(err));
      return;
    }
    if (!token) {
      setError("未收到登录凭证");
      return;
    }

    loginWithToken(token)
      .then(() => navigate("/", { replace: true }))
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "";
        setError(message || "登录失败，请返回登录页重试");
      });
  }, [params, loginWithToken, navigate]);

  return (
    <div className="container auth-page">
      <div className="auth-card post-card">
        <h1 className="auth-title">GitHub 登录</h1>
        {error ? (
          <>
            <div className="auth-error">{error}</div>
            <p className="auth-footer">
              <Link to="/login">返回登录页</Link>
            </p>
          </>
        ) : (
          <p className="auth-subtitle">正在完成登录，请稍候…</p>
        )}
      </div>
    </div>
  );
}
