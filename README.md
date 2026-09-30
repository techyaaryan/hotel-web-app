# Hotel MERN Stack Application

A full-stack Hotel Management system built with Node.js, Express, MongoDB, and React (Vite).

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
# From workspace root:
npm --prefix project/hotel-mern run install-all
```

### 2. Configure Environment Variables
Create `project/hotel-mern/server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### 3. Start Development Server
```bash
npm --prefix project/hotel-mern run dev
```
- Client runs on: `http://localhost:5173`
- Backend runs on: `http://localhost:5000`

---

## 🐳 Running with Docker

Run the entire stack with Docker Compose:

```bash
docker compose up --build
```

- **Frontend**: `http://localhost` (Port 80)
- **Backend API**: `http://localhost:5000`

---

## 🌐 Deploying to Vercel

### Option 1: Deploy Client to Vercel (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
2. Select your GitHub repository.
3. In **Root Directory**, select `project/hotel-mern/client`.
4. Framework Preset: **Vite** (Vercel detects this automatically).
5. (Optional) In **Environment Variables**, add:
   - `VITE_API_URL`: Your backend API URL (e.g. `https://your-hotel-api.onrender.com/api` or your Vercel server URL).
6. Click **Deploy**.

> The included `client/vercel.json` automatically handles single-page-app (SPA) client-side routes.

### Option 2: Deploy Server on Vercel (Serverless Backend)
1. In Vercel, create another project pointing to the same GitHub repo.
2. In **Root Directory**, select `project/hotel-mern/server`.
3. In **Environment Variables**, set:
   - `MONGO_URI`: Your MongoDB Atlas connection URI
   - `JWT_SECRET`: Your secret key
4. Click **Deploy**.

---

## 📤 Push to GitHub

To push this repository to GitHub:

```bash
# 1. Stage and commit
git add .
git commit -m "Initial commit: Hotel MERN full-stack app with Docker & Vercel configuration"

# 2. Set default branch to main
git branch -M main

# 3. Add your remote GitHub repo (replace with your actual GitHub URL)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git

# 4. Push to GitHub
git push -u origin main
```
