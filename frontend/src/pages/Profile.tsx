import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";



const DEFAULT_AVATAR = "/avatar.svg";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;



export function Profile() {

  const { user, loading, updateUser, uploadAvatar, changePassword } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);



  const [nickname, setNickname] = useState("");

  const [email, setEmail] = useState("");

  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [profileSaving, setProfileSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [avatarFallback, setAvatarFallback] = useState(false);



  const [oldPassword, setOldPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const [pwdErr, setPwdErr] = useState<string | null>(null);

  const [pwdSaving, setPwdSaving] = useState(false);



  useEffect(() => {

    if (user) {

      setNickname(user.nickname ?? "");

      setEmail(user.email ?? "");

    }

  }, [user]);



  useEffect(() => {

    setAvatarFallback(false);

  }, [avatarPreview, user.avatar_url]);



  useEffect(() => {

    return () => {

      if (avatarPreview) {

        URL.revokeObjectURL(avatarPreview);

      }

    };

  }, [avatarPreview]);



  if (!loading && !user) {

    return <Navigate to="/login" replace />;

  }



  if (loading || !user) {

    return (

      <div className="profile-page">

        <div className="profile-container">

          <p className="profile-loading">加载中…</p>

        </div>

      </div>

    );

  }



  async function handleProfileSubmit(e: FormEvent) {

    e.preventDefault();

    setProfileMsg(null);

    setProfileErr(null);

    setProfileSaving(true);

    try {

      await updateUser({

        nickname: nickname.trim() || null,

        email: email.trim() || null,

      });

      setProfileMsg("资料已保存");

    } catch (err) {

      setProfileErr(err instanceof Error ? err.message : "保存失败");

    } finally {

      setProfileSaving(false);

    }

  }



  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {

    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;



    setProfileMsg(null);

    setProfileErr(null);



    if (!ACCEPTED_TYPES.includes(file.type)) {

      setProfileErr("请选择 JPEG、PNG、WebP 或 GIF 格式的图片");

      return;

    }

    if (file.size > MAX_AVATAR_BYTES) {

      setProfileErr("图片不能超过 2MB");

      return;

    }



    const previewUrl = URL.createObjectURL(file);

    setAvatarPreview((prev) => {

      if (prev) URL.revokeObjectURL(prev);

      return previewUrl;

    });



    setAvatarUploading(true);

    try {

      await uploadAvatar(file);

      setAvatarPreview((prev) => {

        if (prev) URL.revokeObjectURL(prev);

        return null;

      });

      setProfileMsg("头像已更新");

    } catch (err) {

      setProfileErr(err instanceof Error ? err.message : "头像上传失败");

      setAvatarPreview((prev) => {

        if (prev) URL.revokeObjectURL(prev);

        return null;

      });

    } finally {

      setAvatarUploading(false);

    }

  }



  async function handlePasswordSubmit(e: FormEvent) {

    e.preventDefault();

    setPwdMsg(null);

    setPwdErr(null);

    if (newPassword !== confirmPassword) {

      setPwdErr("两次输入的新密码不一致");

      return;

    }

    setPwdSaving(true);

    try {

      await changePassword(oldPassword, newPassword);

      setPwdMsg(user.has_password === false ? "密码已设置" : "密码已更新");

      setOldPassword("");

      setNewPassword("");

      setConfirmPassword("");

    } catch (err) {

      setPwdErr(err instanceof Error ? err.message : "修改失败");

    } finally {

      setPwdSaving(false);

    }

  }



  const avatarSrc = avatarFallback
    ? DEFAULT_AVATAR
    : avatarPreview || user.avatar_url || DEFAULT_AVATAR;



  return (

    <div className="profile-page">

      <div className="profile-container">

        <Link to="/" className="article-back">

          <span className="article-back-icon">←</span>

          返回首页

        </Link>



        <h1 className="profile-heading">个人中心</h1>

        <p className="profile-subheading">管理你的账号信息与登录密码</p>



        <div className="profile-grid">

          <section className="profile-card post-card">

            <h2 className="profile-card-title">基本资料</h2>

            <div className="profile-avatar-row">

              <div className="profile-avatar-wrap">

                <img

                  className="profile-avatar"

                  src={avatarSrc}

                  alt="头像预览"

                  onError={() => {

                    if (!avatarFallback) {

                      setAvatarFallback(true);

                    }

                  }}

                />

                {avatarUploading && <div className="profile-avatar-overlay">上传中…</div>}

              </div>

              <div className="profile-avatar-hint">

                <div className="profile-username">@{user.username}</div>

                <div className="profile-joined">

                  注册于 {new Date(user.created_at).toLocaleDateString("zh-CN")}

                </div>

                <input

                  ref={fileInputRef}

                  type="file"

                  accept="image/jpeg,image/png,image/webp,image/gif"

                  className="profile-avatar-input"

                  onChange={handleAvatarChange}

                />

                <button

                  type="button"

                  className="profile-avatar-btn"

                  disabled={avatarUploading}

                  onClick={() => fileInputRef.current?.click()}

                >

                  {avatarUploading ? "上传中…" : "更换头像"}

                </button>

                <p className="profile-avatar-tip">支持 JPG / PNG / WebP / GIF，最大 2MB</p>

              </div>

            </div>



            <form className="profile-form" onSubmit={handleProfileSubmit}>

              <label>

                昵称

                <input

                  value={nickname}

                  onChange={(e) => setNickname(e.target.value)}

                  placeholder="展示在导航栏的名字"

                  maxLength={50}

                />

              </label>

              <label>

                邮箱

                <input

                  type="email"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  placeholder="your@email.com"

                />

              </label>

              {profileErr && <div className="profile-error">{profileErr}</div>}

              {profileMsg && <div className="profile-success">{profileMsg}</div>}

              <button type="submit" className="btn-primary" disabled={profileSaving}>

                {profileSaving ? "保存中…" : "保存资料"}

              </button>

            </form>

          </section>



          <section className="profile-card post-card">

            <h2 className="profile-card-title">
              {user.has_password === false ? "设置密码" : "修改密码"}
            </h2>

            <form className="profile-form" onSubmit={handlePasswordSubmit}>

              {user.has_password !== false && (
              <label>

                原密码

                <input

                  type="password"

                  value={oldPassword}

                  onChange={(e) => setOldPassword(e.target.value)}

                  required

                  autoComplete="current-password"

                />

              </label>
              )}

              <label>

                新密码

                <input

                  type="password"

                  value={newPassword}

                  onChange={(e) => setNewPassword(e.target.value)}

                  required

                  minLength={6}

                  autoComplete="new-password"

                />

              </label>

              <label>

                确认新密码

                <input

                  type="password"

                  value={confirmPassword}

                  onChange={(e) => setConfirmPassword(e.target.value)}

                  required

                  minLength={6}

                  autoComplete="new-password"

                />

              </label>

              {pwdErr && <div className="profile-error">{pwdErr}</div>}

              {pwdMsg && <div className="profile-success">{pwdMsg}</div>}

              <button type="submit" className="btn-primary" disabled={pwdSaving}>

                {pwdSaving ? "更新中…" : "更新密码"}

              </button>

            </form>

          </section>

        </div>

      </div>

    </div>

  );

}

