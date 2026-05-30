# 个人博客（第一周 · 全栈容器化）

技术栈：**FastAPI + SQLAlchemy + PostgreSQL**（后端）、**React + Vite + React Router**（前端）、**Docker Compose**（编排）、**Nginx**（静态资源与 API 反代）。

## 目录结构

```
backend/     FastAPI 应用与 seed 脚本
frontend/    Vite + React 前端
nginx/       Nginx 配置与组合构建 Dockerfile
docker-compose.yml
```

## 一键启动（Docker）

在项目根目录执行：

```bash
docker compose up -d --build
```

首次启动后，**导入示例文章**（仅在表为空时写入）：

```bash
docker compose exec backend python seed.py
```

浏览器访问：**http://localhost**（默认映射宿主 `80` 端口）。

- 前端页面：`/` 文章列表、`/articles/:id` 详情、`/about` 关于我。
- 后端 API（经 Nginx 时请加 `/api` 前缀）：`GET /api/articles`、`GET /api/articles/{id}`、`POST /api/articles`。
- 直接访问后端（调试）：`docker compose port backend 8000` 查看映射，或临时在 `docker-compose.yml` 为 `backend` 增加 `ports: ["8000:8000"]`。

`POST /api/articles` 示例：

```bash
curl -X POST http://localhost/api/articles ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"测试\",\"summary\":\"摘要\",\"content\":\"正文\"}"
```

（Linux / macOS 请将 `^` 换为 `\` 续行。）

## 本地开发（不依赖 Docker）

1. 安装并启动 PostgreSQL，创建库与用户（与 `docker-compose.yml` 中一致即可），设置环境变量：

   `DATABASE_URL=postgresql://blog:blogsecret@localhost:5432/blogdb`

2. 后端：

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   python seed.py
   ```

3. 前端（新终端，`vite.config.ts` 已将 `/api` 代理到 `http://127.0.0.1:8000`）：

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   访问 Vite 提示的本地地址（一般为 `http://localhost:5173`）。

## 部署到云服务器（HTTP）

1. 安装 Docker 与 Docker Compose，将本仓库同步到服务器。
2. 安全组 / 防火墙放行 **80**（及后续 **443**）。
3. 执行 `docker compose up -d --build`，再执行 `docker compose exec backend python seed.py`。
4. 将 `nginx/nginx.conf` 中第一个 `server` 块的 `server_name _;` 改为你的域名，例如 `server_name blog.example.com;`，然后 `docker compose up -d --build nginx`。
5. **HTTPS**：在 `nginx/nginx.conf` 底部有注释模板；使用 Let’s Encrypt 等申请证书后，把证书挂进容器（`volumes` 映射到 `/etc/nginx/certs/`），取消注释 `listen 443 ssl` 的 `server` 块，并按需增加 80 → 443 跳转。

生产环境建议修改 `docker-compose.yml` 中的数据库密码，并同步修改 `DATABASE_URL`。

## 头像与关于页

默认头像为 `frontend/public/avatar.svg`。替换为自己的照片时，可将图片放入 `frontend/public/` 并在 `Home.tsx`、`About.tsx` 中把 `img` 的 `src` 改为新文件名。

## 原有 `blog.html`

早期静态演示页仍保留在仓库根目录，与容器化应用独立；新站点以 `frontend/` 为准。
