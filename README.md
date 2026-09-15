# Ascent Mgnt - SEO-First Marketing Template

This repository acts as the **master blueprint** and cloneable architecture for building high-performance, SEO-first marketing websites. It is powered by [Astro](https://astro.build/) (Static Site Generation), [Sanity](https://www.sanity.io/) (Headless CMS), and Vanilla CSS.

## 🤖 AI-Agent Cloning System

If you are using an AI Agent (Cursor, Github Copilot, Gemini) to clone this repository for a new brand, please refer immediately to **[`docs/first-kick-prompt-template.md`](./docs/first-kick-prompt-template.md)**. It contains a copy-paste prompt to automatically execute a brand-clone using this architecture.

You MUST also read **[`docs/seo-first-marketing-website.md`](./docs/seo-first-marketing-website.md)**, which serves as the overarching Architecture Guide and links out to strictly enforced engineering Standard Operating Procedures (SOPs) located in `docs/best-practices/`.

## Tech Stack
- **Framework**: Astro (SSG + Islands Architecture)
- **CMS**: Sanity (v3 Headless)
- **Styles**: Vanilla CSS (Global variables + Scoped modules)
- **Interactions**: Vanilla JS (reveal-on-scroll, mobile menu, hydration)
- **Deployment**: Vercel (Frontend) & Sanity Studio (Backend)

## Local Development Environment

### 1. Project Requirements
- Node.js 18.x or higher
- [pnpm](https://pnpm.io/) 10.x or higher (install with `corepack enable` or `npm install -g pnpm`)

### 2. Environment Variables
Create a `.env` file in the root from `.env.example`:
```bash
cp .env.example .env
```
Fill in your `PUBLIC_SANITY_PROJECT_ID` and dataset variables.

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Run Frontend Development Server
```bash
pnpm run dev
```
The site will be available at `http://localhost:4321`.

### 5. Run Sanity Studio (CMS)
The CMS operates completely independently from the Astro frontend:
```bash
cd studio
pnpm install
pnpm run dev
```
The studio will be available at `http://localhost:3333`.

## Folder Structure
- `docs/best-practices/`: Engineering SOPs and Guidelines (SEO, UX, Testing).
- `src/pages/`: Route definitions (`/`, `/blog`, `/404.astro`, etc.)
- `src/components/`: Reusable Astro components.
- `src/layouts/`: Base layout handling SEO, GA4, and Cookiebot.
- `src/lib/`: Sanity client APIs and GROQ queries.
- `src/styles/`: Global CSS tokens and resets.
- `studio/`: Sanity CMS schema and configuration.
- `public/`: Static assets (images, robots.txt, etc.)

## Deployment
For deployment instructions to Vercel and Sanity Cloud, see **`DEPLOYMENT_GUIDE.md`**.
