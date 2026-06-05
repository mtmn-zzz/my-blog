import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function GitHubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
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
      .catch((e: Error) => setError(e.message || "登录失败"));
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
