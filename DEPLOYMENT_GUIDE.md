# 🚀 Deployment Guide (Astro + Sanity)

This guide outlines exactly how to deploy a new clone of this Astro + Sanity stack to Vercel.

Prior to deploying, ensure you have executed all QA tests defined in `docs/best-practices/04-testing-qa-checklist.md`.

## Step 1: Push to Repository

Ensure all local changes, particularly your `.env` variables and localized Brand data, are committed.

```bash
git add .
git commit -m "Initial commit for new brand"
git push origin main
```

## Step 2: Configure Vercel (Frontend)

1. Go to your Vercel Dashboard and click "Add New... Project".
2. Import the Git repository.
3. **Framework Preset**: Vercel should automatically detect **Astro**. If not, manually select it.
4. **Root Directory**: Leave as default (`./`).
5. **Environment Variables**: Open the Environment Variables tab. Add the following from your `.env` file:
    *   `PUBLIC_SANITY_PROJECT_ID="your_project_id"`
    *   `PUBLIC_SANITY_DATASET="production"`
    *   `PUBLIC_SANITY_API_VERSION="2024-03-01"`
    *   `PUBLIC_SANITY_USE_CDN="true"`
6. Click **Deploy**.

## Step 3: Sanity CORS Settings (Critical)

Your newly deployed Vercel frontend will return `401 Unauthorized` or CORS blocks if Sanity doesn't trust the domain.

1. Go to the [Sanity Management Console](https://www.sanity.io/manage).
2. Select your project.
3. Go to **API** → **CORS Origins**.
4. Add your new Vercel production URL (e.g., `https://newbrand.com` and `https://newbrand.vercel.app`). Ensure you check **Allow credentials**.

## Step 4: Sanity Webhook Integration

Because Astro builds static HTML pages (`output: 'static'`), the frontend must be re-deployed whenever an editor publishes a new blog post in Sanity.

1. **In Vercel**: Go to Project Settings -> Git -> Deploy Hooks.
2. Create a new hook called `Sanity Webhook` and copy the generated URL.
3. **In Sanity Console**: Go to project Settings -> API -> Webhooks.
4. Create a new webhook:
   - **URL**: Paste the Vercel Deploy Hook URL.
   - **Trigger on**: Create, Update, Delete.
   - **Filter**: `_type == "post" || _type == "author"` (or leave blank to trigger on all dataset changes).
   - **Projection**: Leave default.

## Step 5: Sanity Studio Deployment (Backend)

You need to host the Sanity Editor GUI so clients/content managers can log in.

### Option A: Vercel (Recommended)
1. In Vercel, click "Add New... Project" and select the *same* Git repository.
2. **Root Directory**: Click "Edit" and set the directory to **`studio`**.
3. **Build Settings**:
    *   Framework Preset: **Vite**.
    *   Install Command: `pnpm install`
    *   Build Command: `pnpm run build`
    *   Output Directory: `dist`
4. Add Environment Variables specifically for the studio:
    *   `SANITY_STUDIO_PROJECT_ID`: `your_project_id`
    *   `SANITY_STUDIO_DATASET`: `production`
5. Click **Deploy**. (*Note: `studio/vercel.json` handles the SPA routing.*)

### Option B: Sanity Hosting
Open your terminal in the `studio` folder:
```bash
cd studio
pnpm exec sanity deploy
```
Follow the prompts to choose a URL (e.g., `yourbrand.sanity.studio`).

---

### Verifying the Production Build
- Checked: **Forms** successfully submit without errors.
- Checked: **Sitemap** is generated at `/sitemap-index.xml`.
- Checked: **RSS Feed** is available at `/rss.xml.js`.
- Checked: Making an edit in Sanity automatically triggers a build in Vercel.

Your site is now a high-performance, SEO-optimized Static Site! 🚀
