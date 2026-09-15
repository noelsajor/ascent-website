# Cybersecurity & Data Protection Standards

Because this stack utilizes a decoupled API-first structure (Astro + Sanity), traditional server-side vulnerabilities (like SQL injection) are largely mitigated. However, you must enforce the following security policies to protect credentials, user data, and infrastructure.

## 1. Environment Variable Hygiene

The most common security breach in modern static sites is leaking keys to the client payload.

- **Client-Side Variables**: Only variables prefixed with `PUBLIC_` (e.g., `PUBLIC_SANITY_PROJECT_ID`) will be bundled into the frontend HTML/JS. ONLY use this for safe, public-facing identifiers (like an analytics ID or a public CMS dataset).
- **Secret Keys**: Any sensitive token (e.g., Stripe Secret Keys, deeply scoped Sanity Write Tokens) **must not** have the `PUBLIC_` prefix. Astro will restrict them to server-side or build-time execution only.
- Never commit `.env` or `.env.local` to Git. Ensure they remain in `.gitignore`.

## 2. Headless CMS (Sanity) Security

- **CORS Origins**: Inside your Sanity project management dashboard, strictly define exactly which domains are allowed to hit your API (e.g., `https://yourbrand.com`, `http://localhost:4321`, `https://yourbrand-studio.sanity.studio`). Do not leave CORS open to `*`.
- **Dataset Privacy**: If your CMS contains private customer data or unpublished proprietary info, set your Sanity dataset from `Public` to `Private`. Note: If `Private`, your Astro build pipeline will require a read token to fetch data, meaning `useCdn: false` must be set and authenticated.
- **Write Tokens**: Ensure any API route submitting data *back* to Sanity (like a form submission) uses a heavily scoped Write Token that only has permission to `create` specific documents, not `delete` or `read` others.

## 3. Web Form Security (XSS & Spam Prevention)

Forms (like `contact.astro`) are the primary vehicle for malicious payloads.
- **Honeypots**: Include hidden fields that bots auto-fill, and discard the submission on the server side if filled. This is highly preferred over user-punishing visual captchas.
- **Data Sanitization**: Never blindly render user-submitted form data. If mapping form submissions to a dashboard, sanitize HTML against Cross-Site Scripting (XSS).
- **Rate Limiting**: Ensure whatever endpoint processes your forms (Vercel Serverless Functions, Zapier, Formspree) has strict IP rate limiting enabled to prevent DDoS spam attacks.

## 4. Content Security Policy (CSP) & HTTP Headers

For maximum resilience against malicious injected scripts, establish a sturdy set of HTTP headers. In Vercel, this is typically handled by creating a `vercel.json` file in the root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```
*Note: A strict `Content-Security-Policy` header is also highly recommended, but must be carefully tuned to allow your specific Analytics, Cookiebot, and Sanity CDN origins.*

## 5. Dependency Management

Static sites are compiled code, meaning malicious NPM libraries are compiled directly into your distribution if not caught.
- Run `pnpm audit` before major deployments.
- Lock dependencies utilizing `package-lock.json` and rigidly test any updates before arbitrarily upgrading Astro or Sanity to breaking versions.
