# Deploy KingVypers ke Railway

## 1. Buat project di Railway

1. Buka [railway.app](https://railway.app) dan login.
2. **New Project** → **Deploy from GitHub repo** (atau **Empty Project** kalau mau deploy lewat CLI).

## 2. Tambah PostgreSQL

1. Di project → **+ New** → **Database** → **PostgreSQL**.
2. Setelah provision, buka service PostgreSQL → tab **Variables** → copy **DATABASE_URL**.

## 3. Deploy aplikasi

**Opsi A – Dari GitHub**

1. **+ New** → **GitHub Repo** → pilih repo yang isinya project ini.
2. Railway akan detect Node.js dan pakai `railway.toml` (build: `npm run build`, start: `npm start`).
3. Buka service aplikasi → **Variables** → tambah variable:

| Variable         | Value / sumber                    |
|------------------|------------------------------------|
| `DATABASE_URL`   | Paste dari service PostgreSQL      |
| `SESSION_SECRET` | String rahasia (min 32 karakter)   |
| `PORT`           | Biasanya di-set otomatis oleh Railway |

Opsi: kalau pakai bot Discord untuk reset HWID, tambah `BOT_SECRET`.

**Opsi B – Dari CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Di folder project
cd path/ke/Kingvyperspremv2-main
railway link   # pilih atau buat project

# Set env (atau set manual di dashboard)
railway variables set DATABASE_URL="postgresql://..."
railway variables set SESSION_SECRET="random-secret-min-32-char"

# Deploy
railway up
```

## 4. Jalankan migrasi database

Setelah deploy pertama dan `DATABASE_URL` sudah benar:

```bash
# Set DATABASE_URL dulu (atau lewat Railway dashboard)
railway run npm run db:push
```

Atau di **Railway** → service aplikasi → **Settings** → **Deploy** → tambah **One-off command**:  
`npm run db:push` (jalan sekali untuk push schema).

## 5. URL aplikasi

- Di Railway: service aplikasi → **Settings** → **Networking** → **Generate Domain**.
- Akses lewat domain yang diberikan (mis. `https://xxx.up.railway.app`).

## 6. Update script Lua

Di `vyperui.lua`, ganti `API_URL` ke URL Railway kamu:

```lua
API_URL = "https://xxx.up.railway.app",
```

## Env vars ringkas

| Variable        | Wajib | Keterangan                          |
|-----------------|-------|-------------------------------------|
| `DATABASE_URL`  | ✅    | Dari add-on PostgreSQL              |
| `SESSION_SECRET`| ✅    | Secret untuk JWT (ganti di production) |
| `PORT`          | ❌   | Di-set Railway                      |
| `BOT_SECRET`    | ❌   | Hanya kalau pakai bot reset HWID    |
