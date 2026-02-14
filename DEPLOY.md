# Deployment Guide - Swing Scanner

This guide will help you deploy your Swing Trading Scanner to the web using **Vercel**, the best platform for Next.js apps.

## Prerequisites
1.  **GitHub Account**: You need a GitHub account to host your code.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com) using your GitHub account.

## Step 1: Push Code to GitHub

You need to initialize a git repository and push your code. Run these commands in your terminal (inside the `swingtrading` folder):

```bash
# 1. Initialize Git
git init

# 2. Add all files
git add .

# 3. Commit changes
git commit -m "Initial commit - Swing Scanner App"

# 4. Create a new repository on GitHub.com (e.g., "swing-scanner")

# 5. Link your local folder to GitHub (Replace URL with your own)
git remote add origin https://github.com/YOUR_USERNAME/swing-scanner.git

# 6. Rename branch to main
git branch -M main

# 7. Push code
git push -u origin main
```

## Step 2: Deploy on Vercel

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  You will see a list of your GitHub repositories. Find `swing-scanner` and click **"Import"**.
4.  **Configure Project**:
    *   **Framework Preset**: Next.js (Should be auto-detected).
    *   **Root Directory**: `./` (Default).
    *   **Build Command**: `next build` (Default).
    *   **Output Directory**: `.next` (Default).
5.  Click **"Deploy"**.

## Step 3: Wait & Verify

*   Vercel will install dependencies and build your app. This usually takes 1-2 minutes.
*   Once done, you will get a **Live URL** (e.g., `https://swing-scanner.vercel.app`).
*   Open the link and try running a scan!

## Troubleshooting

### "Function Timeout" Error
If the scanner fails with a timeout error:
1.  The free plan has a **10-second limit** for serverless functions.
2.  We have already optimized the scanner to run in parallel batches, which makes it very fast.
3.  If it still times out on larger lists (like Nifty 200), try scanning smaller lists (Nifty 50) or upgrade to Vercel Pro (60s limit).

### "500 Internal Server Error"
*   Check the "Logs" tab in your Vercel Project dashboard to see the exact error message.
*   It's usually an issue with Yahoo Finance rate limits if you scan too aggressively.
