# Whispr – Production Deployment Checklist

## Backend (e.g. Render, Railway, Fly.io)

1. **Environment variables** (see `backend/.env.example`):
   - `MONGO_URI` – MongoDB connection string
   - `JWT_SECRET` – Long random string (≥32 chars)
   - `FRONTEND_URL` – Your frontend URL (e.g. `https://whispr-nine.vercel.app`)
   - `ALLOWED_ORIGINS` (optional) – Comma-separated CORS origins; if set, overrides defaults
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` – For image uploads
   - `NODE_ENV=production`
   - `PORT` – Usually set by the host (e.g. Render uses `PORT`)

2. **CORS**: Backend allows origins from `FRONTEND_URL` and localhost by default. For multiple domains, set `ALLOWED_ORIGINS=https://app1.com,https://app2.com`.

3. **Health**: `GET /` returns JSON; use it for health checks.

4. **WebSockets**: Socket.IO runs on the same server/port as the API. Ensure the host allows WebSocket upgrades.

---

## Frontend (e.g. Vercel, Netlify)

1. **Build env** (set in Vercel/Netlify dashboard):
   - `VITE_API_URL` – Backend API URL (e.g. `https://your-app.onrender.com`)
   - `VITE_SOCKET_URL` (optional) – Same as `VITE_API_URL` if Socket.IO is on the same host

2. **Build**: `npm run build` (Vite). Output is in `dist/`.

3. **Redirects**: For SPA routing, redirect all routes to `index.html` (Vercel/Netlify usually do this by default for single-page apps).

---

## Pre-launch checks

- [ ] Backend env vars set (no localhost in production)
- [ ] Frontend `VITE_API_URL` and `VITE_SOCKET_URL` point to the live backend
- [ ] CORS includes your frontend URL (or `ALLOWED_ORIGINS` is set)
- [ ] MongoDB and Cloudinary work from the deployed backend
- [ ] Login, register, chat list, and message send/receive work
- [ ] Profile photo and chat image upload work (Cloudinary)
- [ ] Real-time updates (Socket.IO) work after login

---

## Security notes

- Never commit `.env` or real secrets; use `.env.example` as a template only.
- Rotate `JWT_SECRET` and Cloudinary keys if they were ever exposed.
- Keep backend and frontend on HTTPS in production.
