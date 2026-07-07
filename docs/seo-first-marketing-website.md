# SEO-first marketing website

## 📋 About This Solution

This template captures the exact architecture behind the `ascent-website` project — a **production-grade, SEO-first marketing website** built for service and brand businesses that need to grow organically through search, content, and social media.

### What Problem Does This Solve?

Most brands need a website that does more than look good. This stack is specifically engineered to:

- **Rank in Google** from day one — without relying on paid traffic.
- **Load at maximum speed** — because search engine rankings are directly correlated with performance.
- **Publish content easily** — through a friendly, non-technical CMS that marketing teams can actually use.
- **Scale across multiple brands** — with minimal code changes per new project.

---

### 🔍 SEO-First Design

This is the core principle behind every architectural decision. The solution is built with the following SEO features baked in by default:

| Feature | Implementation |
|---|---|
| **Canonical URLs** | Automatically generated per-page via `SEO.astro` |
| **Open Graph & Twitter Cards** | Dynamic meta tags for rich social sharing previews |
| **JSON-LD Structured Data** | `Organization`, `WebSite`, `BreadcrumbList`, and `BlogPosting` schemas via `JSONLD.astro` |
| **Sitemap** | Auto-generated for search engine crawlers (`@astrojs/sitemap`) |
| **RSS Feed** | Blog content auto-published via `@astrojs/rss` for syndication |
| **Google Analytics (GA4)** | Embedded tracking for traffic and conversion measurement |
| **Google Site Verification** | Pre-wired for Google Search Console submission |
| **Per-page Title & Description** | Each page passes unique `title` and `description` props to the `BaseLayout` |

---

### ⚡ Performance-Optimized by Default

Astro's **static-first output** (`output: 'static'`) means every page ships as plain HTML — no JavaScript sent to the browser unless you explicitly opt in. This results in near-perfect Core Web Vitals scores (LCP, CLS, FID), which Google uses directly as ranking signals.

Additional performance decisions baked in:
- **Non-render-blocking fonts**: Google Fonts loaded with `media="print"` + `onload` swap pattern.
- **Non-render-blocking third-party CSS**: Calendly widget CSS loaded the same way.
- **Scroll-reveal animations**: Handled by a lightweight, custom vanilla JS file (`reveal.js`) — no heavy animation library needed.

---

### 📝 Headless Content Management (Sanity v3)

The blog and dynamic content sections are powered by **Sanity CMS** — a headless CMS that decouples content from code. This means:
- Marketing teams can publish blog posts, edit copy, or swap images without touching code.
- Content is fetched at build time, keeping the site static and fast.
- The Studio deploys independently from the frontend, so CMS updates don't require a full site rebuild.

---

### 🔒 GDPR / Privacy Compliance Built In

The `BaseLayout.astro` integrates **Cookiebot** for cookie consent management, making the site compliant with GDPR (EU), CCPA (California), and similar privacy regulations out of the box. This is especially important for clients running paid ads or using analytics tools.

---

### 👥 Who Is This For?

This solution is ideal for:
- **Marketing/creative agencies** managing multiple client websites.
- **Brand founders** who need a high-performance web presence quickly.
- **Developers** who want a proven, repeatable codebase they can reskin per client.

---

## 📚 Engineering Standards & Best Practices

To make this template "bulletproof", exhaustive standards have been abstracted into standalone, heavily-documented modules. 

> [!CAUTION]
> **MANDATORY DIRECTIVE FOR ALL AGENTS & DEVELOPERS:** 
> You must continually refer to and apply these standards **DURING** the creation of any new component, page, or feature. Specifically, you must execute the Cybersecurity testing and QA protocols defined in these modules *before* finalizing your code. Do not wait until launch day to apply security or accessibility fixes.

- 🎯 **[SEO & Generative Engine Optimization (GEO) Guidelines](./best-practices/01-seo-geo-guidelines.md)** (Structured data, Open Graph, Core Web Vitals)
- 🎨 **[UI & UX Standards](./best-practices/02-ui-ux-standards.md)** (Accessibility, F-Pattern scanning, Breakpoints, Typography)
- 🚀 **[Astro Frontend Development](./best-practices/03-astro-development.md)** (Zero-JS hydration, image component handling, CLS prevention)
- ✅ **[Pre-Launch QA & Testing Checklist](./best-practices/04-testing-qa-checklist.md)** (Lighthouse targets, Cross-browser tests)
- 📝 **[Sanity CMS Architecture](./best-practices/05-sanity-cms-architecture.md)** (Schema management, portable text, Webhooks)
- 🔒 **[Cybersecurity & Data Protection](./best-practices/06-cybersecurity-standards.md)** (Env variables, Sanity CORS, XSS form prevention, CSP headers)
- 📈 **[Analytics & Conversion Tracking](./best-practices/07-analytics-conversion-standards.md)** (GA4 event dispatching, GDPR pixel blocking, UTM persistence)
- 🐙 **[GitHub & Version Control Standards](./best-practices/08-github-commit-standards.md)** (Conventional commits, branch naming, PR reviews)
- 🧹 **[Code Formatting & Linting](./best-practices/09-code-formatting-linting.md)** (Astro rules, indentation limits, CSS variable usage)

---

## 🤝 Client Handoff

When the project is completely finished, export the **[`client-handoff-manual.md`](./client-handoff-manual.md)** as a PDF and provide it to the client. It contains non-technical instructions safely teaching them how to log into their new Sanity CMS, how to compress/upload images, and how to publish blog posts.

---

## 🏗️ Architecture Overview

The platform uses a decoupled structure within a single repository (pseudo-monorepo):
1. **Frontend**: Astro (v4) with Vanilla CSS (`/src` and `/public`).
2. **CMS/Backend**: Sanity Studio (v3) in a dedicated subfolder (`/studio`).
3. **Deployment**: Vercel (Frontend builds) and Sanity (Studio deployment).

---

## 🗺️ Routing Map & Page Structure

*(For AI Agents: Use this map to understand how the navigation is built)*

The `/src/pages` directory defines the routing for the application.
- **`/` (`index.astro`)**: The primary landing page orchestrating the sales funnel.
- **`/about`**: Company background, mission, and the Team grid (`About.astro`).
- **`/blog`**: Main blog listing page. Fetches all posts from Sanity.
- **`/blog/[slug]`**: Dynamic route for individual blog posts.
- **`/contact`**: Lead generation form / inquiry page.
- **`/packages`**: Breakdown of services, pricing tiers, and deliverables.
- **`/product`**: Detailed showcase of a specific physical/digital product offering.
- **`/work`**: Portfolio gallery or case studies listing.
- **`/privacy`**: Standard legal text for Privacy Policy and Terms.
- **`/rss.xml.js`**: Automatically generates an RSS feed for blog syndication.
- **`/sitemap.xml.js`**: Generates a dynamic XML sitemap (if not using `@astrojs/sitemap`).
- **`/404.astro`**: Custom SEO-friendly error fallback page designed to recover lost traffic.

---

## 🧱 Component Inventory

*(For AI Agents: The `/src/components` directory holds all modular UI blocks)*

**Core / Layout Components**
- `Header.astro` & `Footer.astro`: Global navigation, branding, and footer links.
- `SEO.astro` & `JSONLD.astro`: Head injected tags for search engines and rich snippets.
- `FinalCTA.astro`: A reusable call-to-action block placed at the bottom of major pages.

**Landing Page Sections (Mounted in `index.astro`)**
- `Hero.astro`: Above-the-fold introductory headline, subheadline, and primary CTA.
- `Portfolio.astro`: A visual masonry/grid showcasing past client work.
- `Babysitter.astro`: A specialized narrative section explaining the "done-for-you" pain point.
- `Packages.astro`: Service tier cards with feature lists.
- `TikTok.astro`: Embedded social proof or short-form video showcase.
- `HowItWorks.astro`: Step-by-step process visualization (e.g., 1. Audit, 2. Create, 3. Scale).
- `BlogTeaser.astro`: Fetches and displays the latest 3 blog posts from Sanity.
- `Testimonials.astro`: Carousel or grid of client reviews.
- `FAQ.astro`: Collapsible accordion for frequently asked questions.
- `About.astro`: The team array and company narrative (used on the About page).
- `BubbleBackground.astro`: A decorative background effect component.

---

## 📝 Sanity Data Model (Schema setup)

The CMS requires specific schemas to function. Located in `/studio/schemas`:
1. `post.js` - Blog post content, images, author reference, category reference, and rich text body.
2. `author.js` - Name, avatar image, and bio.
3. `category.js` - Taxonomy for blog grouping.
4. `blockContent.js` - The Portable Text configuration defining allowed rich text elements (bold, links, embedded images).

---

## 🛠️ Step-by-Step Setup Guide

### 1. Initialize the Astro Frontend
Create the base Astro project and install dependencies:

```bash
npm create astro@latest ./new-brand-site -- --template minimal
cd new-brand-site
npm install @astrojs/rss @sanity/client
```

Update `astro.config.mjs` to match the static generation pattern:
```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://your-new-brand-domain.com',
  output: 'static',
  integrations: [], // Add specific integrations here
});
```

### 2. Configure Sanity Studio
Inside the project root, scaffold the Sanity Studio:

```bash
npm create sanity@latest -- --template clean --create-project "New Brand Name" --dataset production ./studio
```
> [!IMPORTANT]
> Change directory into `studio` (`cd studio`) and start the developer server there when modifying the CMS schema. The Studio runs completely independently of the Astro frontend.

### 3. Environment Variables
Create a `.env` file in the root of the Astro project:

```bash
PUBLIC_SANITY_PROJECT_ID="your_new_project_id"
PUBLIC_SANITY_DATASET="production"
PUBLIC_SANITY_API_VERSION="2024-03-01"
PUBLIC_SANITY_USE_CDN="true"
```

### 4. Create Data Fetching Layer (`/src/lib/sanity.js`)
Replicate the exact data fetching methods so Astro components don't break:

```javascript
import { createClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION || '2024-03-01';
const useCdn = import.meta.env.PUBLIC_SANITY_USE_CDN === 'true';

export const client = projectId ? createClient({ projectId, dataset, apiVersion, useCdn }) : null;

// Core fetching methods required by the blog components:
export async function getAllPosts() { /* ... */ }
export async function getPostBySlug(slug) { /* ... */ }
export async function getLatestPosts(count = 3) { /* ... */ }
export async function getRelatedPosts(slug, categoryTitle) { /* ... */ }
```

### 5. Standardize the `BaseLayout.astro`
To ensure all technical integrations transfer over seamlessly, your `/src/layouts/BaseLayout.astro` must include:
- `SEO` and `JSONLD` components.
- **Google GA4** snippet.
- **Cookiebot** script for consent.

---

## 🎨 BRAND CUSTOMIZATION CHECKLIST (Find & Replace)

When cloning this repository for a new brand, run through this required checklist to uncouple it from the original "Ascent Mgnt" brand. Any AI Agent assisting with the clone should use this as a strict checklist.

### 1. Global Identity Replacements
- [ ] Update `site` URL in `astro.config.mjs` (e.g., `https://ascentmgnt.com` -> `https://newbrand.com`).
- [ ] Replace `name` and `version` strings in both `package.json` and `studio/package.json`.
- [ ] Replace the default logo image: Swap `/public/assets/ascent_logo.svg` with the new brand's logo.

### 2. Header & Footer Data (`Header.astro`, `Footer.astro`)
- [ ] Update physical address, email (`mailto:hello@...`), and phone links.
- [ ] Replace Social Media URLs (LinkedIn, Twitter, Instagram, TikTok, YouTube).
- [ ] Update footer copyright text: `Ascent Mgnt` -> `New Brand Name`.

### 3. SEO & JSON-LD Defaults (`SEO.astro`, `JSONLD.astro`)
- [ ] Default `title` and `description` props in `SEO.astro`.
- [ ] Change the Default Open Graph image fallback (`og:image`).
- [ ] Update the `name`, `url`, and `logo` fields inside the `organizationData` JSON-LD object.

### 4. Third-Party Integrations (`BaseLayout.astro`)
- [ ] **Google Site Verification**: Replace the `google-site-verification` meta content key.
- [ ] **Google Analytics (GA4)**: Replace the Measurement ID `G-NRF9V8QJYR` in the gtag snippet.
- [ ] **Cookiebot**: Replace the `data-cbid` UUID mapping to the localized property domain.

### 5. Static Content & Copy
- [ ] **`index.astro`**: Rewrite the `title` and `description` variables at the top of the file.
- [ ] **`About.astro`**: Swap out the `teamMembers` array data (names, roles, images, linkedin URIs) and rewrite the company biography strings.
- [ ] **`Hero.astro`** & **`Babysitter.astro`**: Update the core H1/H2 value propositions and copy payloads specifically tuned to the new service model.
- [ ] **`Packages.astro`**: Redefine service tiers and bullet points.

### 6. Design System (`src/styles/global.css`)
- [ ] Update CSS custom properties for Colors (`--color-primary`, `--bg-dark`, etc.).
- [ ] Update Typography variables and `@import`/`<link>` tags if swapping Google Fonts.
- [ ] Adjust border-radius tokens (`--radius-sm`, `--radius-lg`) depending on if the brand is "sharp/slick" or "rounded/approachable".
