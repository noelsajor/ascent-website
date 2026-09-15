# Agency Master Operation Folder (`/docs`)

Welcome to the central brain of this project template. Everything you need to automatically spin up, architecture, and hand over a brand new SEO-optimized marketing website is completely self-contained in this directory.

## 🚀 How to Start a New Brand Build

If you are beginning a new web project for a client using this codebase, **do not write any code manually yet.** Use this directory as your starting point.

### Step 1: Fire The "First Kick" Prompt
1. Open the file **[`first-kick-prompt-template.md`](./first-kick-prompt-template.md)**.
2. Fill inside the brackets (e.g., `[Insert Brand Name Here]`, `[Insert Colors]`) to match your new client's identity.
3. Open a powerful AI IDE (like Cursor, Devin, or Windsurf) or an AI agent chat window.
4. Upload your client's logo to the chat context.
5. Copy/paste the entire filled-out prompt into the chat and hit Enter.

### Step 2: Let the Agent Build
The AI Agent will use the prompt to read the **[`seo-first-marketing-website.md`](./seo-first-marketing-website.md)** framework guide located in this folder. 

That framework enforces 9 strict engineering standard operating procedures (located in `/best-practices/`) covering:
- Zero-JS Astro Hydration
- Generative Engine Optimization (GEO) & Schema
- Cybersecurity Tests
- GDPR Tracking Compliance

The AI will handle 90-95% of the heavy lifting. It will scrub out the old brand assets, re-route the CSS, correctly inject tracking snippets, and build out your requested pages securely.

### Step 3: Polish and QA
Once the agent finishes the *First Kick*, you can interact with it further to polish any padding, copy, or UI elements. Before you hit `pnpm run deploy`, manually verify the work against the **[`Pre-Launch QA Checklist`](./best-practices/04-testing-qa-checklist.md)** to ensure maximum Lighthouse scores.

### Step 4: The Client Handoff
Once the website is live, do not just send the client a URL.
Export the **[`client-handoff-manual.md`](./client-handoff-manual.md)** as a PDF and send it to them. It provides a simple, non-technical tutorial on how they can safely update their blog through Sanity CMS, crop their own images, and maintain their website without developer support.
