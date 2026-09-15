# Security Audit Remediation Tracker

This tracker converts the September 2026 read-only security audit into accountable work items. Keep each item checked only after the fix is implemented, reviewed, deployed where applicable, and verified with the listed evidence.

## Scope Note

This is now substantially more complete, but it still cannot prove that these are the only possible issues. Authenticated Sanity roles, Vercel environment/settings, deployed Studio behavior, cloud IAM, secret values, and active penetration testing were outside the passive read-only scope.

## Priority Order

1. Fix confirmed XSS paths.
2. Upgrade vulnerable dependency stacks.
3. Protect production delivery and secrets.
4. Add browser and Studio hardening headers.
5. Correct privacy, XML, and lower-risk hygiene issues.
6. Complete the out-of-scope validation work from the scope note.

## Critical And High Priority

- [x] **Stored CMS XSS in blog Portable Text rendering**
  - **Severity**: High
  - **Where**: `src/pages/blog/[slug].astro`, sink at `set:html={bodyHtml}`
  - **Current danger**: Sanity body content is concatenated into HTML strings without escaping and rendered through `set:html`. A compromised Sanity editor account, malicious editor, imported bad content, or leaked write token can publish JavaScript that executes for visitors. Because the site is statically generated, the payload can remain baked into deployed HTML until content is cleaned and the site is rebuilt.
  - **Fix**: Replaced the hand-rolled `portableTextToHtml()` with the official `@portabletext/to-html` renderer (escapes span text by default). Added a custom `link` mark component using the library's `uriLooksSafe()` to reject non-`http(s)`/`mailto`/`tel`/relative schemes (e.g. `javascript:`), and an `escapeAttr()` helper so `href`/`src` values can't break out of their HTML attribute. Also added `Rule.uri({scheme:[...]})` validation to `studio/schemas/blockContent.js` so editors can no longer save a `javascript:` link in the first place (defense in depth).
  - **Verification**: `pnpm run build` passes. Ran the renderer directly against three payloads: (1) `<img src=x onerror=alert(document.domain)>` as span text → rendered as inert escaped text inside `<p>`, not executable markup; (2) a `link` mark with `href="javascript:alert(document.domain)"` → link stripped, only the text renders, no `<a>` emitted; (3) a `href` containing `"><script>` → the quote/angle-brackets were HTML-entity escaped, no attribute breakout. Could not exercise this through an actual live blog post in this environment (no Sanity content connected here), so verify once more against a real published test post before considering this fully closed in production.

- [ ] **JSON-LD script breakout XSS**
  - **Severity**: High
  - **Where**: `src/components/JSONLD.astro:52-55`, called from layouts/pages that pass title and description
  - **Current danger**: `JSON.stringify()` does not safely escape `</script>` in an HTML script context. A CMS-controlled title or description can close the JSON-LD script and inject executable JavaScript into the document head.
  - **Fix**: Add a JSON-LD serializer that replaces `<`, `>`, `&`, U+2028, and U+2029 before `set:html`, or use a trusted helper that performs script-safe serialization.
  - **Verification**: Test a title like `</script><script>alert(document.domain)</script>` and confirm the generated HTML contains escaped unicode sequences, not a real closing script tag.

- [ ] **Vulnerable root dependency stack**
  - **Severity**: High
  - **Where**: `package.json`, `package-lock.json`
  - **Current danger**: `pnpm audit` (root now uses pnpm, formerly npm) reports 17 root advisories including 1 critical. Some Astro advisories are lower live-runtime risk because `astro.config.mjs` uses `output: 'static'`, but build-time, image-processing, dev-server, RSS, and supply-chain risks remain real.
  - **Fix**: Run a controlled upgrade path. Apply non-breaking fixes first, upgrade `@astrojs/rss` to a patched version, then plan and test the major Astro migration required by remaining advisories.
  - **Verification**: `pnpm audit` has no high/critical findings that apply to production, build, CI, or dev workflows; `pnpm run build` passes after upgrades.

- [ ] **Vulnerable Sanity Studio dependency stack**
  - **Severity**: High
  - **Where**: `studio/package.json`, `studio/package-lock.json`
  - **Current danger**: `pnpm audit` (studio now uses pnpm, formerly npm) reports 38 Studio advisories including 2 critical. Highest relevance is Studio runtime, CLI/build tooling, archive extraction, Vite/dev-server behavior, and CI compromise paths.
  - **Fix**: Upgrade the Studio stack deliberately, likely through a major Sanity migration, and test schemas, workspaces, build output, authentication, and deployed Studio behavior.
  - **Verification**: `pnpm audit` in `studio/` has no high/critical findings that apply to runtime, build, CI, or dev workflows; `pnpm run build` in `studio/` passes. Note: `pnpm run build` (and equally `npm run build`, confirmed identical) currently fails locally on Node v26.7.0 with a pre-existing, unrelated `yargs` ESM/CJS resolution error — retest on the Node LTS version actually used by Vercel before relying on this check.

- [ ] **Unprotected production branch**
  - **Severity**: High
  - **Where**: GitHub repository settings for `main`
  - **Current danger**: `main` is not protected and there are no rulesets. A compromised collaborator token, mistaken push, or force push can change production without review or required checks.
  - **Fix**: Protect `main`, require pull requests, require review, require status checks, block force pushes, block branch deletion, and enforce rules for administrators unless there is a documented exception.
  - **Verification**: GitHub reports branch protection/rulesets active for `main`; direct push to `main` is rejected.

- [ ] **Environment leak workflow and unignored Studio env file**
  - **Severity**: High
  - **Where**: `.gitignore:8-13`, `DEPLOYMENT_GUIDE.md:9`, observed `studio/.env.development`
  - **Current danger**: The repository is public. `studio/.env.development` is untracked but not ignored, and the deployment guide currently tells developers to commit `.env` variables. This creates a direct accidental secret disclosure path.
  - **Fix**: Ignore all `.env` files in all directories except safe examples, correct the deployment guide so env values are configured only in local/Vercel/Sanity secret stores, and rotate any secret that was ever committed or exposed.
  - **Verification**: `git status --ignored` shows local env files ignored; docs no longer instruct committing env files; secret scanning shows no exposed secrets.

## Medium Priority

- [ ] **Missing public-site Content Security Policy**
  - **Severity**: Medium
  - **Where**: `vercel.json`
  - **Current danger**: Confirmed XSS paths and third-party scripts have no browser-level containment. If injected or compromised JavaScript lands, the browser has no site policy limiting script execution, outbound connections, frames, or resource loading.
  - **Fix**: Add `Content-Security-Policy-Report-Only` first, tune it for Astro, Google Tag Manager, Cookiebot, Calendly, YouTube embeds, Google Fonts, and Sanity image CDN, then enforce with hashes or nonces where needed.
  - **Verification**: Live responses include CSP; SecurityHeaders.com reports CSP present; key pages still work without console CSP violations except expected report-only tuning events.

- [ ] **Missing Sanity Studio security headers**
  - **Severity**: Medium
  - **Where**: `studio/vercel.json`
  - **Current danger**: A deployed Studio lacks explicit clickjacking, content-type, referrer, permissions, and script-hardening headers. This is riskier than the public site because Studio is an authenticated admin/editor interface.
  - **Fix**: Add Studio-specific headers, including CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, strict referrer policy, and a restrictive `Permissions-Policy`.
  - **Verification**: Deployed Studio responses include the headers and Studio login/editor flows still work.

- [ ] **Dependabot and automated security checks disabled or absent**
  - **Severity**: Medium
  - **Where**: GitHub repository settings, missing `.github/` workflows
  - **Current danger**: Known vulnerabilities can remain invisible, and dependency/build failures can reach production because there are no required automated checks.
  - **Fix**: Enable Dependabot alerts and security updates, add CI for root and Studio builds, add audit checks appropriate for production/build/dev risk, and require those checks on `main`.
  - **Verification**: GitHub security settings show Dependabot enabled; PRs display required build/audit checks.

- [ ] **Google Analytics loads before Cookiebot consent**
  - **Severity**: Medium
  - **Where**: `src/layouts/BaseLayout.astro:27-36`
  - **Current danger**: GA loads and configures before Cookiebot, so analytics may run before visitor consent. This is a privacy/compliance risk, especially for GDPR/CCPA visitors.
  - **Fix**: Default Google Consent Mode to denied, load GA only through Cookiebot consent categories, and run `gtag('config')` only after appropriate consent.
  - **Verification**: Before consent, no analytics cookies/events are sent; after statistics consent, GA loads and sends events.

- [ ] **RSS XML injection advisory**
  - **Severity**: Medium
  - **Where**: `src/pages/rss.xml.js`, `@astrojs/rss@4.0.15`
  - **Current danger**: The installed RSS package version is affected by XML injection via unescaped RSS fields. The feed uses CMS-controlled title and description fields, so malformed or malicious XML can be generated.
  - **Fix**: Upgrade `@astrojs/rss` to at least the patched `4.0.19` version and regenerate `package-lock.json`.
  - **Verification**: `pnpm audit` no longer reports `@astrojs/rss`; feed output remains valid XML.

- [ ] **Sitemap XML injection or malformed XML from CMS slugs**
  - **Severity**: Medium
  - **Where**: `src/pages/sitemap.xml.js:29-36`
  - **Current danger**: CMS slugs are interpolated directly into XML. A malicious or malformed slug can corrupt the sitemap or inject extra XML nodes, affecting crawler behavior and SEO integrity.
  - **Fix**: Validate Sanity slugs to safe URL path characters, URL-encode slug path segments, and XML-escape every interpolated XML value.
  - **Verification**: A slug with XML-significant characters cannot be saved, or is encoded safely in generated sitemap XML.

- [ ] **Vision plugin enabled in all Studio environments**
  - **Severity**: Medium
  - **Where**: `studio/sanity.config.js:3,8`
  - **Current danger**: Authenticated Studio users can run arbitrary GROQ queries through Vision within their permissions. Useful for developers, but too broad for production editorial environments.
  - **Fix**: Enable `visionTool()` only in development or restrict it to admin-only Studio deployments.
  - **Verification**: Production Studio does not expose Vision to normal editorial users.

- [ ] **DMARC policy is monitoring-only**
  - **Severity**: Medium
  - **Where**: DNS `_dmarc.ascentmgnt.com` currently returns `v=DMARC1; p=none; ...`
  - **Current danger**: Spoofed email using the domain is easier to deliver because receivers are not instructed to quarantine or reject failing mail.
  - **Fix**: Review aggregate reports, align SPF/DKIM, move to `p=quarantine`, then `p=reject` when legitimate senders are verified.
  - **Verification**: DMARC TXT record shows `p=quarantine` or `p=reject`; reports show legitimate mail alignment remains healthy.

## Low Priority And Hygiene

- [ ] **Wildcard CORS on public static responses**
  - **Severity**: Low
  - **Where**: Live Vercel responses include `Access-Control-Allow-Origin: *`
  - **Current danger**: Any origin can read public static GET responses. This is low risk today because responses are public, and preflighted writes were not authorized, but it can become dangerous if private/API responses later inherit the same behavior.
  - **Fix**: Remove wildcard CORS unless intentionally required. If needed, scope CORS to exact paths and trusted origins.
  - **Verification**: `curl -I -H 'Origin: https://evil.example' https://ascentmgnt.com/` no longer returns wildcard CORS, or only approved paths do.

- [ ] **Fake contact form success state**
  - **Severity**: Low security, medium business integrity
  - **Where**: `src/components/Contact.astro:96-111`
  - **Current danger**: The form prevents default submission, never sends data, and shows a success alert. Visitors can believe they contacted the business when no lead was captured.
  - **Fix**: Remove the fake form and rely on Calendly, or wire it to a real endpoint with server-side validation, rate limiting, spam protection, and privacy disclosure.
  - **Verification**: Success appears only after confirmed backend receipt, or the form is removed.

- [ ] **Duplicate and global Calendly script loading**
  - **Severity**: Low
  - **Where**: `src/components/Header.astro:155`, `src/components/Contact.astro:115`
  - **Current danger**: The same third-party script loads globally and again on the contact page, increasing third-party execution surface and potential reliability issues.
  - **Fix**: Load Calendly once, preferably lazily only when a Calendly trigger or widget exists.
  - **Verification**: Contact and header booking flows still work with only one Calendly script request.

- [ ] **Obsolete `X-XSS-Protection` header**
  - **Severity**: Low
  - **Where**: `vercel.json:8`
  - **Current danger**: The header is obsolete and ignored by modern browsers; in legacy browsers it can cause inconsistent behavior. It is not a real substitute for CSP.
  - **Fix**: Remove it or set `X-XSS-Protection: 0` after CSP is handled.
  - **Verification**: Live responses no longer advertise legacy XSS filtering as a control.

- [ ] **Missing `Permissions-Policy`**
  - **Severity**: Low
  - **Where**: `vercel.json`, `studio/vercel.json`
  - **Current danger**: Browser APIs such as camera, microphone, geolocation, payment, and USB are not explicitly disabled.
  - **Fix**: Add a restrictive policy such as `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` and adjust only if a feature truly needs access.
  - **Verification**: Live responses include `Permissions-Policy`.

- [ ] **Generated Sanity runtime files are tracked**
  - **Severity**: Low
  - **Where**: `studio/.sanity/runtime/app.js`, `studio/.sanity/runtime/index.html`
  - **Current danger**: Generated dev/runtime artifacts create drift and can accidentally expose generated internals or noisy changes.
  - **Fix**: Remove tracked `.sanity/runtime/*` files from Git and ignore `studio/.sanity/`.
  - **Verification**: `git ls-files 'studio/.sanity/**'` returns nothing after cleanup.

- [ ] **Astro generator version disclosure**
  - **Severity**: Low
  - **Where**: `src/components/SEO.astro:21`
  - **Current danger**: Public HTML exposes the exact Astro version, helping attackers correlate known advisories with the deployed site.
  - **Fix**: Remove `<meta name="generator" content={Astro.generator} />` from production output.
  - **Verification**: Live HTML no longer includes the Astro generator meta tag.

- [ ] **No public security disclosure contact**
  - **Severity**: Low
  - **Where**: `/.well-known/security.txt` returns 404
  - **Current danger**: Security researchers have no standardized contact or disclosure policy.
  - **Fix**: Add `public/.well-known/security.txt` with contact, policy, preferred language, and expiry.
  - **Verification**: `https://ascentmgnt.com/.well-known/security.txt` returns 200 after deployment.

- [ ] **DNSSEC, MTA-STS, and TLS reporting are not configured**
  - **Severity**: Low
  - **Where**: DNS records
  - **Current danger**: Domain and mail transport have less protection against DNS tampering and downgrade/visibility gaps.
  - **Fix**: Enable DNSSEC if registrar/DNS host supports it, add MTA-STS and TLS-RPT records after confirming mail provider compatibility.
  - **Verification**: DNSSEC validates, `_mta-sts` and `_smtp._tls` TXT records exist, and the MTA-STS policy file is reachable.

## Out-Of-Scope Validation Backlog

- [ ] **Authenticated Sanity roles and permissions**
  - **Danger if unresolved**: Overbroad editor/admin access can turn CMS compromise into stored XSS, data disclosure, or unauthorized content changes.
  - **How to solve**: Review Sanity project members, roles, tokens, CORS origins, dataset visibility, and deploy hooks. Enforce least privilege and rotate stale tokens.
  - **Verification**: Only required users and tokens remain; write tokens are scoped; untrusted origins are rejected.

- [ ] **Vercel project settings and environment variables**
  - **Danger if unresolved**: Misconfigured env vars, overly broad team access, leaked deploy hooks, or preview settings can expose secrets or deploy unsafe builds.
  - **How to solve**: Review Vercel team/project access, environment variables, deploy hooks, domains, preview protections, build logs, and integration permissions.
  - **Verification**: Least-privilege project access, no stale deploy hooks, no secret values in logs, and preview/production settings match policy.

- [ ] **Deployed Studio behavior and access control**
  - **Danger if unresolved**: A public Studio URL with weak controls increases phishing, clickjacking, content tampering, and authenticated app attack surface.
  - **How to solve**: Identify deployed Studio URL, verify Sanity auth, headers, allowed origins, Vision availability, workspace visibility, and no accidental open access.
  - **Verification**: Unauthenticated users cannot access editorial data; normal editors cannot access developer-only tools; headers pass checks.

- [ ] **Cloud IAM and third-party integrations**
  - **Danger if unresolved**: Compromised integrations can modify deployments, content, analytics, or DNS outside the repository.
  - **How to solve**: Review GitHub, Vercel, Sanity, Google Analytics/Tag Manager, Cookiebot, Calendly, DNS provider, Microsoft 365, and registrar access.
  - **Verification**: MFA enforced, stale users removed, least privilege applied, and recovery contacts are current.

- [ ] **Secret values and rotation status**
  - **Danger if unresolved**: Previously exposed or over-scoped secrets can still grant access even after code fixes.
  - **How to solve**: Inventory all secrets, rotate any unknown/stale/exposed values, remove unused tokens, and document owners and expiration cadence.
  - **Verification**: Secret inventory is current; old tokens fail; new tokens are scoped and stored only in approved secret stores.

- [ ] **Active penetration testing**
  - **Danger if unresolved**: Passive review can miss runtime-only issues, auth workflow flaws, misconfigured deployed services, and business-logic vulnerabilities.
  - **How to solve**: Run authorized active testing against staging first, then production within a defined scope and rate limits.
  - **Verification**: Pen-test report is complete, findings are triaged, and retesting confirms fixes.

## Confirmed Positive Controls

- TLS 1.0 and TLS 1.1 are rejected.
- TLS 1.2 works; TLS 1.3 support was observed by passive assessment, although local `curl` could not test it due local build support.
- HTTP and `www` redirect to the HTTPS apex host.
- HSTS is active on live responses.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` are active on sampled public routes.
- Sanity rejects an untrusted browser origin.
- Public Sanity draft count query returned zero drafts.
- SPF, DKIM, and CAA records exist.
- No committed secret file was found in the inspected Git history.
- GitHub secret scanning and push protection are both enabled on the repository.
- Sanity GROQ queries use parameterized query params (`$slug`, `$categoryTitle`), not string-concatenated input — no GROQ injection path found.
- The only `Astro.redirect()` call site uses a hardcoded literal target (`/404`), not a request-controlled value — no open-redirect vector.
- No API routes, middleware, or GitHub Actions workflows exist in this repo, which removes several classes of risk (request-handler auth bypass, SSRF via server endpoints, CI/workflow injection) that would otherwise need review.
