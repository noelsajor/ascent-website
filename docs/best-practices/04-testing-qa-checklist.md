# Pre-Launch Quality Assurance (QA) Checklist

Before any modified project or new brand clone goes live, run through this QA checklist to verify technical integrity, performance, and operational integrations.

## 1. Performance Testing (Lighthouse)

Run Lighthouse (in Google Chrome Developer Tools via an "Incognito" window or via the `PageSpeed Insights` web portal) on the **production build**, not the dev server.

To generate a local production build to test:
```bash
pnpm run build
pnpm run preview
```
### Required Passing Targets:
- **Performance**: 90+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

*If Performance falls below 90, check for large unoptimized images or render-blocking 3rd party scripts (like Calendly or Chat widgets).*

## 2. Cross-Device & Browser Validation

The layout must not break or trigger horizontal scrolling under any standard viewport.
- **Mobile Check (Simulated in DevTools)**: Check iPhone SE (small screen) and iPhone 14 Pro Max.
- **Tablet Check**: Check iPad (portrait and landscape).
- **Browser matrix**: 
  - Chrome (Latest)
  - Safari Desktop (macOS)
  - iOS Safari (Physical mobile device if possible, due to bottom viewport height rendering quirks `100vh` vs `100svh`).

## 3. SEO & Meta Tags Validation

- Open the source code (`Cmd+U` / `Ctrl+U`) and verify the `<title>`, `<meta name="description">`, and `canonical` tags are exactly as expected.
- Validate **JSON-LD** injection using the [Google Rich Results Test](https://search.google.com/test/rich-results).
- Confirm there is exactly ONE `<h1>` tag rendering per page.
- Test Open Graph (Social Sharing) rendering utilizing tools like [opengraph.dev](https://opengraph.dev). 

## 4. Forms & Third-Party Scripts

- **Contact Form**: Run a test submission. Does it send to the correct client endpoint? Does it render a success message, or handle errors gracefully?
- **Cookiebot/GDPR**: Does the banner appear? Does it properly block Analytics scripts before consent is given? Does it pass the data-layer attributes correctly?
- **Analytics**: Does Google Analytics fire in the network tab upon consent? Validate the Tracking ID matches the expected brand.

## 5. Deployment / Webhooks (Vercel & Sanity)

Because this is a decoupled architecture, updating content in the Sanity CMS Studio does **not** dynamically update the frontend without a build trigger.
- **Test the Webhook**: Verify that a webhook exists inside the Sanity Project settings pointing to a Vercel Deploy Hook URL.
- Make a minor edit to a blog post, click "Publish" in Sanity, and verify that it correctly kicks off an Astro build pipeline in Vercel automatically.

## 6. Cybersecurity Audits & Validations

**CRITICAL RULE**: These tests must be successfully passed during the creation of *any* new feature, component, or page, and prior to any production push.

- **Header Scans (CSP & XSS)**: 
  - Deploy the project to a staging URL and run it through [SecurityHeaders.com](https://securityheaders.com/). 
  - Ensure you receive at least an `A` rating. Confirm `X-Frame-Options` and `X-Content-Type-Options` are active.
- **Environment Leakage Check**:
  - Open Chrome DevTools -> network tab -> download the compiled `.js` chunk on the new page.
  - Search the payload for known secret variables (e.g., Sanity Write Tokens, Stripe Secrets). If they appear in the payload, you have breached rule #1 (`PUBLIC_` prefix rules).
- **Form Injection Testing**:
  - Perform manual QA on any `<form>` element by submitting fake JSON strings, basic XSS payloads (`<script>alert(1)</script>`), or invalid characters. Confirm that the backend securely handles/sanitizes them and the site does not crash or render the payload locally.
- **Package Auditing**:
  - Before a final push, you must run `pnpm audit`. Remediate any High or Critical vulnerabilities in your dependencies before clearing the task.
