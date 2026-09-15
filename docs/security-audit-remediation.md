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

- [x] **JSON-LD script breakout XSS**
  - **Severity**: High
  - **Where**: `src/components/JSONLD.astro`
  - **Current danger**: `JSON.stringify()` does not safely escape `</script>` in an HTML script context. A CMS-controlled title or description can close the JSON-LD script and inject executable JavaScript into the document head.
  - **Fix**: Added a `safeJsonLd()` serializer that escapes `<`, `>`, `&`, U+2028, and U+2029 before `set:html`, and routed all four `set:html={JSON.stringify(...)}` call sites through it.
  - **Verification**: Ran the serializer directly against `</script><script>alert(document.domain)</script>` — output contains no raw `</script>`, only `</script>...`, and still round-trips through `JSON.parse` correctly. Confirmed in the actual `pnpm run build` output (`dist/index.html`) that a real page description containing `&` renders as `&` in the live JSON-LD tags.

- [ ] **Vulnerable root dependency stack** *(partially fixed — safe patches applied, major Astro bump still open)*
  - **Severity**: High
  - **Where**: `package.json`, `pnpm-lock.yaml`
  - **Current danger**: `pnpm audit` originally reported 53 advisories (1 critical, 22 high, 23 moderate, 7 low) — a higher count than npm's 17 because pnpm resolves/reports the dependency graph more granularly; same underlying issues either way. Some Astro advisories are lower live-runtime risk because `astro.config.mjs` uses `output: 'static'`, but build-time, image-processing, dev-server, RSS, and supply-chain risks remain real.
  - **Fix applied so far**: Bumped `@astrojs/rss` to `^4.0.19` (patched). Added `pnpm.overrides` in `package.json` pinning safe, same-major patched versions of transitive deps: `devalue`, `sharp`, `postcss`, `postcss-selector-parser`, `nanoid`, `browserslist`, `baseline-browser-mapping`, `vite`, `esbuild`, `follow-redirects`. Explicitly did **not** override `@babel/core` or `js-yaml` — both broke the build with `does not provide an export named 'default'` errors (an ESM/CJS interop issue under this machine's Node v26.7.0) when bumped to their patched versions, so those two advisories remain open rather than risk a silent break.
  - **Remaining**: All remaining advisories (now 1 critical, 3 high, 10 moderate, 4 low) are attributed to `astro` itself — the patched versions require jumping from the installed 4.16.19 across three majors (5, 6, 7) to reach `>=7.2.8`. This is a deliberate, separately-planned migration (breaking changes, needs full manual QA per `docs/best-practices/04-testing-qa-checklist.md` since there's no automated test suite) — not yet started.
  - **Verification**: `pnpm run build` passes and `dist/rss.xml` / `dist/sitemap.xml` remain valid XML after the safe patches. Full closure still requires the major Astro migration plus retesting `@babel/core`/`js-yaml` on a stable Node LTS version (the export-interop failure may be specific to this machine's non-LTS Node build).

- [ ] **Vulnerable Sanity Studio dependency stack** *(patching blocked — see note)*
  - **Severity**: High
  - **Where**: `studio/package.json`, `studio/pnpm-lock.yaml`
  - **Current danger**: `pnpm audit` in `studio/` (isolated, after removing an accidental root-level `pnpm-workspace.yaml` that had merged it with the root project) reports 109 advisories across 23 packages: 2 critical (`decompress`, `tar` — Zip Slip-style archive-extraction CVEs reachable via `sanity dataset export`/`@sanity/vision` CLI tooling), 43 high, 55 moderate, 9 low. Also affects `@babel/core`, `js-yaml`, `vite`, `browserslist`, `nanoid`, `postcss`, `follow-redirects`, `baseline-browser-mapping`, `adm-zip`, `brace-expansion`, `dompurify`, `form-data`, `glob`, `json-2-csv`, `lodash`, `lodash-es`, `prismjs`, `undici`, `uuid`, `ws`, `yaml`.
  - **Why patching is blocked right now**: `pnpm run build` in `studio/` already fails independent of any dependency change (pre-existing `yargs` ESM/CJS resolution error under this machine's Node v26.7.0 — see the dependency-stack item above). Root's equivalent patch pass just proved that even "safe" same-major patch bumps (`@babel/core`, `js-yaml`) can silently break Astro's build via ESM/CJS export-interop issues on this Node version — the same class of failure is plausible here, and with no working build there is no way to verify an override doesn't break Studio. Per explicit decision, deferred rather than applying unverified overrides.
  - **Fix**: Once a stable Node LTS (22 or 24) is available to actually run `pnpm run build`/`pnpm run dev` in `studio/`, apply the same pattern as root: pin safe same-major patched versions via `pnpm.overrides` for packages that verify clean, then plan and test the larger Sanity Studio v3→v4 migration required for `decompress`/`tar`/`vite`-chain criticals that don't have a same-major fix.
  - **Verification**: `pnpm audit` in `studio/` has no high/critical findings that apply to runtime, build, CI, or dev workflows; `pnpm run build` in `studio/` passes on a Node LTS version.

- [x] **Unprotected production branch**
  - **Severity**: High
  - **Where**: GitHub repository settings for `main`
  - **Current danger**: `main` is not protected and there are no rulesets. A compromised collaborator token, mistaken push, or force push can change production without review or required checks.
  - **Fix**: Applied branch protection to `main` via `gh api`: require a pull request with at least 1 approving review (stale reviews dismissed on new commits), require conversation resolution before merge, block force pushes, block branch deletion. Deliberately left **admins exempt** (`enforce_admins: false`) — documented owner decision, since this is a small/solo-maintained repo and `DEPLOYMENT_GUIDE.md` documents a direct-push bootstrap step for new brand clones. No required status checks yet, since there's no CI configured (tracked separately under "Dependabot and automated security checks disabled or absent").
  - **Verification**: `gh api repos/noelsajor/ascent-website/branches/main/protection` confirms `required_approving_review_count: 1`, `allow_force_pushes: false`, `allow_deletions: false`, `required_conversation_resolution: true`, `enforce_admins: false`.

- [x] **Environment leak workflow and unignored Studio env file**
  - **Severity**: High
  - **Where**: `.gitignore`, `DEPLOYMENT_GUIDE.md`, observed `studio/.env.development`
  - **Current danger**: The repository is public. `studio/.env.development` is untracked but not ignored, and the deployment guide currently tells developers to commit `.env` variables. This creates a direct accidental secret disclosure path.
  - **Fix**: Replaced the narrow, per-file `.gitignore` env patterns (`.env`, `.env.local`, `.env.development.local`, etc. — which missed plain `.env.development`) with a catch-all `.env*` rule plus a `!.env.example` negation, so any env file at any depth is ignored except the committed template. Corrected `DEPLOYMENT_GUIDE.md` Step 1 to explicitly say never to commit `.env`/`.env.*` files and to configure them only through the Vercel dashboard (Step 2), instead of instructing developers to commit them.
  - **Verification**: `git check-ignore -v studio/.env.development` now matches the new `.env*` rule (previously not ignored); `git status` no longer lists it as untracked; `.env.example` remains correctly un-ignored. Checked `studio/.env.development`'s contents (via the prior independent audit, since direct reads of `.env` files are blocked by tool policy): only `SANITY_STUDIO_*_PROJECT_ID` values, which are meant to be public identifiers, not secrets — no rotation needed. `git log --all --oneline -- '*.env*'` still shows only `.env.example` (template values) was ever committed.

## Medium Priority

- [ ] **Missing public-site Content Security Policy** *(Report-Only shipped, not yet enforced)*
  - **Severity**: Medium
  - **Where**: `vercel.json`
  - **Current danger**: Confirmed XSS paths and third-party scripts have no browser-level containment. If injected or compromised JavaScript lands, the browser has no site policy limiting script execution, outbound connections, frames, or resource loading.
  - **Fix**: Added `Content-Security-Policy-Report-Only`, tuned by grepping every external host actually referenced in `src/`/`public/` and classifying each by real usage (script src, stylesheet, iframe, or plain `<a href>` link, which CSP doesn't govern): `script-src`/`connect-src` cover GTM, Cookiebot, and Calendly's widget; `frame-src` covers YouTube (`youtube-nocookie.com`) and Calendly's popup (confirmed via `Header.astro`'s `Calendly.initPopupWidget` call, not just its plain link hrefs); `style-src` needs `'unsafe-inline'` because Astro compiles scoped component `<style>` blocks and some dynamic `style=` attributes inline (nonces aren't possible for a fully static/no-adapter build, and per-block hashes would be too fragile against routine content edits). Confirmed via the built `dist/index.html` that all real `<script>` tags are same-origin (`/_astro/hoisted-*.js`, from Astro's own hoisting) or one of the explicitly allowed external hosts — no `'unsafe-inline'` needed on `script-src`.
  - **Verification**: `pnpm run build` passes; JSON-validated the header value structurally. **Not yet verified against real browser console violations** — there's no deployed environment or report-collection endpoint available in this session. Before flipping to enforcing `Content-Security-Policy`, open the deployed site in DevTools across all page types (home, blog post, contact) and confirm the console shows no unexpected violations, only the pages behaving normally.

- [ ] **Missing Sanity Studio security headers** *(Report-Only headers shipped, needs live tuning)*
  - **Severity**: Medium
  - **Where**: `studio/vercel.json`
  - **Current danger**: A deployed Studio lacks explicit clickjacking, content-type, referrer, permissions, and script-hardening headers. This is riskier than the public site because Studio is an authenticated admin/editor interface.
  - **Fix**: Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and a minimal `Content-Security-Policy-Report-Only` (`default-src 'self'; frame-ancestors 'none'`). Deliberately kept the CSP minimal rather than guessing at Sanity's full script/style/API surface — Studio's build is currently broken in this environment (the pre-existing `yargs`/Node v26 issue), so it can't be run locally to observe its real network calls.
  - **Verification**: JSON-validated the config structurally. **Not yet verified live** — once Studio can actually run (either on a Node LTS version or once deployed), open it in DevTools, log in, and exercise the editor to see which additional hosts the report-only CSP flags (Sanity's own API/CDN domains, `api.sanity.io`, etc.), then tighten `default-src 'self'` into explicit directives before enforcing.

- [ ] **Dependabot and automated security checks disabled or absent** *(Dependabot enabled — CI workflow still open)*
  - **Severity**: Medium
  - **Where**: GitHub repository settings, missing `.github/` workflows
  - **Current danger**: Known vulnerabilities can remain invisible, and dependency/build failures can reach production because there are no required automated checks.
  - **Fix applied so far**: Enabled Dependabot vulnerability alerts (`PUT /repos/.../vulnerability-alerts`) and Dependabot security updates (`PUT /repos/.../automated-security-fixes`) via `gh api`.
  - **Remaining**: No CI workflow exists yet (`.github/workflows/` is empty) to build root + Studio and run `pnpm audit` on PRs, and `main`'s branch protection has no required status checks (deliberately, since none exist — see the branch protection item above). Adding CI is a separate, larger task: it needs decisions about which Node version to pin (this environment's local Node v26.7.0 breaks Studio's build; CI should almost certainly pin a Node LTS instead) and what should block a merge vs. just warn.
  - **Verification**: `gh api repos/noelsajor/ascent-website --jq '.security_and_analysis'` shows `dependabot_security_updates.status: "enabled"`; `gh api repos/noelsajor/ascent-website/vulnerability-alerts` returns `204`. CI/required-checks verification still pending.

- [ ] **Google Analytics loads before Cookiebot consent**
  - **Severity**: Medium
  - **Where**: `src/layouts/BaseLayout.astro:27-36`
  - **Current danger**: GA loads and configures before Cookiebot, so analytics may run before visitor consent. This is a privacy/compliance risk, especially for GDPR/CCPA visitors.
  - **Fix**: Default Google Consent Mode to denied, load GA only through Cookiebot consent categories, and run `gtag('config')` only after appropriate consent.
  - **Verification**: Before consent, no analytics cookies/events are sent; after statistics consent, GA loads and sends events.

- [x] **RSS XML injection advisory**
  - **Severity**: Medium
  - **Where**: `src/pages/rss.xml.js`, `@astrojs/rss@4.0.15`
  - **Current danger**: The installed RSS package version is affected by XML injection via unescaped RSS fields. The feed uses CMS-controlled title and description fields, so malformed or malicious XML can be generated.
  - **Fix**: Upgraded `@astrojs/rss` from `^4.0.1` (resolved 4.0.15) to `^4.0.19` (patched) in `package.json`; regenerated `pnpm-lock.yaml`.
  - **Verification**: `pnpm audit` no longer reports `@astrojs/rss`; confirmed `dist/rss.xml` parses as valid XML after `pnpm run build`.

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

- [x] **Obsolete `X-XSS-Protection` header**
  - **Severity**: Low
  - **Where**: `vercel.json`
  - **Current danger**: The header is obsolete and ignored by modern browsers; in legacy browsers it can cause inconsistent behavior. It is not a real substitute for CSP.
  - **Fix**: Changed `X-XSS-Protection: 1; mode=block` to `X-XSS-Protection: 0`, done together with adding the CSP header above.
  - **Verification**: Confirmed the new value in `vercel.json`; will show on live responses once deployed.

- [x] **Missing `Permissions-Policy`**
  - **Severity**: Low
  - **Where**: `vercel.json`, `studio/vercel.json`
  - **Current danger**: Browser APIs such as camera, microphone, geolocation, payment, and USB are not explicitly disabled.
  - **Fix**: Added `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` to both `vercel.json` and `studio/vercel.json`.
  - **Verification**: Confirmed the header in both config files; will show on live responses once deployed.

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
