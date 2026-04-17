# COMPOSURE — Trading Station

Session clock-in system for the Composure Method. Treat trading like a job.

## Features

- **PIN Authentication** — 4-digit PIN to clock in, stored locally on your device
- **Auto-Detected Sessions** — Asia, London, and New York sessions detected by Pacific Time
- **Pre-Trade Accountability Check** — warns you if you try to trade a session you didn't clock in for
- **Attendance Tracking** — streak counter, session history, and daily averages

## Session Times (Pacific Time)

| Session     | Open       | Close      |
|-------------|------------|------------|
| Asia/Tokyo  | 4:00 PM    | 1:00 AM    |
| London      | 12:00 AM   | 9:00 AM    |
| New York    | 5:00 AM    | 2:00 PM    |

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
```

Open `http://localhost:5173` in your browser.

## Deploy to Vercel (Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" → select your repo
4. Click "Deploy" — done

Your app will be live at `https://your-project.vercel.app`

## Deploy to Netlify (Free)

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repo, set build command to `npm run build` and publish directory to `dist`
5. Click "Deploy"

## How It Works

All data is stored in your browser's `localStorage`. Nothing leaves your device. If you clear your browser data, your PIN and attendance history will reset.
