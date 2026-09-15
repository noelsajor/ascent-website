# Security Audit Remediation Tracker

This tracker converts the September 2026 read-only security audit into accountable work items. Keep each item checked only after the fix is implemented, reviewed, deployed where applicable, and verified with the listed evidence.

## Scope Note

This is now substantially more complete, but it still cannot prove that these are the only possible issues. Authenticated Sanity roles, Vercel environment/settings, deployed Studio behavior, cloud IAM, secret values, and active penetration testing were outside the passive read-only scope.

## Status Summary (updated 2026-09-15)

**Done (17 of 31 tracked items — count includes the 2 items discovered during live CSP verification):** blog Portable Text XSS, JSON-LD script-breakout XSS, unprotected `main` branch, env-leak/`.gitignore` gap, GA-before-consent ordering, RSS XML injection, sitemap XML injection, duplicate Calendly script, obsolete `X-XSS-Protection`, missing `Permissions-Policy`, tracked Sanity runtime files, Astro generator disclosure, wildcard CORS (site + Studio), security.txt (confirmed live 200), public-site CSP (enforced, verified live in a real browser — zero violations across 3 page types), Dependabot + CI required checks (PR #8, build-only workflow, applies to Dependabot PRs too), Calendly inline widget empty (script ordering fix, `defer` added — pending live re-verification after merge).

**Note on tooling access**: this session turned out to have more live access than initially assumed — outbound network access (`curl`), the Vercel API/CLI (project settings, deployment protection, DNS record management via `vercel dns`), `vercel curl` for testing protected preview deployments, and real-browser automation (Claude in Chrome, after working through a stuck extension connection) for actually checking console violations and rendered behavior. Several items previously marked "can't verify from this environment" have since been checked directly against production.

**Shipped but not fully verified (needs the authenticated Studio session to check, which this session doesn't have credentials for):**
- Studio headers/CSP — live as `Content-Security-Policy-Report-Only`; the pre-auth login screen is confirmed clean, but the real editing UI needs its own domains added before it can be enforced.

**New findings from this session's live verification (not caused by any of this session's changes):**
- Cookiebot's domain isn't authorized in its own dashboard — the consent banner never renders, so Google Analytics never loads at all right now. Dashboard fix needed, not code.
- The Calendly inline widget on `/contact` renders empty. Needs its own investigation.

**Held at your request (code written, deliberately NOT committed):**
- Vision plugin dev-only gating in `studio/sanity.config.js` — sitting as an uncommitted local change pending your own `sanity dev`/`sanity build` verification, since Studio's build is broken in this environment. Ask me to commit it once you've checked it, or apply it yourself.

**Partially fixed, real work remains:**
- Root dependency stack — safe transitive patches applied (53→18 advisories); the rest needs a deliberate Astro 4→7 major-version migration.
- Studio dependency stack — patching deferred entirely; Studio's build is broken here independent of any dependency change, so overrides can't be verified safely.
- Dependabot/CI — Dependabot alerts + security updates are enabled (live GitHub setting); no CI workflow exists yet to add required status checks.

**Not started — needs a decision from you:**
- Fake contact form success state (remove the form, or wire up a real submission endpoint).

**Skipped — can't be verified or fixed from this environment:**
- DMARC, DNSSEC, MTA-STS, TLS reporting (DNS records, not repo config — see below, DNS access has since been confirmed available).

**Out-of-scope backlog (unchanged, needs access this session doesn't have):** authenticated Sanity roles/permissions, Vercel project settings and env vars, deployed Studio access control, cloud IAM/third-party integration review, secret rotation status, active penetration testing.

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

- [x] **Missing public-site Content Security Policy**
  - **Severity**: Medium
  - **Where**: `vercel.json`
  - **Current danger**: Confirmed XSS paths and third-party scripts have no browser-level containment. If injected or compromised JavaScript lands, the browser has no site policy limiting script execution, outbound connections, frames, or resource loading.
  - **Fix**: Added `Content-Security-Policy`, tuned by grepping every external host actually referenced in `src/`/`public/` and classifying each by real usage (script src, stylesheet, iframe, or plain `<a href>` link, which CSP doesn't govern): `script-src`/`connect-src` cover GTM, Cookiebot, and Calendly's widget; `frame-src` covers YouTube (`youtube-nocookie.com`) and Calendly's popup (confirmed via `Header.astro`'s `Calendly.initPopupWidget` call, not just its plain link hrefs); `style-src` needs `'unsafe-inline'` because Astro compiles scoped component `<style>` blocks and some dynamic `style=` attributes inline. Shipped as `Report-Only` first, then flipped to enforcing after live verification.
  - **Verification**: `pnpm run build` passes. Verified live with a real browser (Claude in Chrome, after working around a stuck browser-extension connection) across the homepage, `/contact`, and a blog post: **zero CSP console violations** on any page; visual checks confirm normal rendering (including the new XSS-safe blog renderer). Confirmed via `vercel curl` that the deployed header reads `content-security-policy` (enforcing), not `-report-only`. Two unrelated pre-existing issues surfaced during this check and were **not** caused by CSP (no frame/connect violations logged for either): Cookiebot's domain isn't authorized in its own dashboard (consent banner never renders, so GA never loads — confirmed via network log showing zero `gtag.js`/collect requests), and the Calendly inline widget on `/contact` renders an empty container. Both need separate follow-up outside this tracker item.

- [ ] **Missing Sanity Studio security headers** *(Report-Only headers shipped, needs live tuning)*
  - **Severity**: Medium
  - **Where**: `studio/vercel.json`
  - **Current danger**: A deployed Studio lacks explicit clickjacking, content-type, referrer, permissions, and script-hardening headers. This is riskier than the public site because Studio is an authenticated admin/editor interface.
  - **Fix**: Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and a minimal `Content-Security-Policy-Report-Only` (`default-src 'self'; frame-ancestors 'none'`). Deliberately kept the CSP minimal rather than guessing at Sanity's full script/style/API surface — Studio's build is currently broken in this environment (the pre-existing `yargs`/Node v26 issue), so it can't be run locally to observe its real network calls.
  - **Verification**: JSON-validated the config structurally. Verified live with a real browser against `studio.ascentmgnt.com`'s **pre-authentication login screen**: zero console messages, clean render, confirmed unauthenticated visitors only see a login-provider chooser (Google/GitHub/email) with no editorial data exposed. **Still not verified for the authenticated editing session** — logging in, exercising the editor, Vision tool, and image uploads to see which additional hosts the Report-Only CSP flags (Sanity's own API/CDN domains, `api.sanity.io`, etc.) needs real Studio credentials this session doesn't have, before tightening `default-src 'self'` into explicit directives and enforcing.

- [x] **Dependabot and automated security checks disabled or absent**
  - **Severity**: Medium
  - **Where**: GitHub repository settings, `.github/workflows/ci.yml`
  - **Current danger**: Known vulnerabilities can remain invisible, and dependency/build failures can reach production because there are no required automated checks.
  - **Fix**: Enabled Dependabot vulnerability alerts and security updates via `gh api` (done earlier). Added `.github/workflows/ci.yml` (PR [#8](https://github.com/noelsajor/ascent-website/pull/8), merged separately from the `dev`→`main` security-fix PRs to keep it isolated): two jobs, `Build (root site)` and `Build (Sanity Studio)`, triggered on `pull_request` against `main`, pinned to Node 24 (matches the Node 24.x LTS both Vercel projects actually run in production) and pnpm `10.28.2` (matches `packageManager` in both `package.json`), running `pnpm install --frozen-lockfile` then `pnpm run build`. Deliberately build-only — no lint config, no `tsconfig.json`, and no test files exist in either project, so a lint/typecheck/test step would have nothing real to run. Added both job names as required status checks on `main`'s branch protection, preserving every existing rule (1 approval, force-push/deletion blocked, admins exempt, conversation resolution required). Applies uniformly to Dependabot PRs (no bot exemption in GitHub's required-checks model, and the workflow uses the standard `pull_request` trigger, not `pull_request_target`, so it's safe against untrusted PR code with no secrets exposure). Confirmed `allow_auto_merge: false` at the repo level before touching anything and left it untouched — Dependabot PRs still need a manual merge after checks pass and review is given.
  - **Discovered but not fixed (out of scope for the CI PR, tracked separately)**: `studio/package.json`'s `"type-check": "tsc"` script is currently non-functional — `typescript` isn't installed as a dependency (confirmed locally: `tsc: command not found`), and there's no `tsconfig.json` anywhere in the repo. Needs its own follow-up (add the dependency, write a tsconfig, then wire it into CI) rather than being bolted onto the build-validation workflow.
  - **Verification**: `gh api repos/noelsajor/ascent-website --jq '.security_and_analysis'` shows `dependabot_security_updates.status: "enabled"`. Ran the workflow live on PR #8: both jobs passed (`Build (root site)` 18s, `Build (Sanity Studio)` 39s). Confirmed via `gh api repos/.../branches/main/protection` that `required_status_checks.contexts` is exactly `["Build (root site)", "Build (Sanity Studio)"]`.

- [x] **Google Analytics loads before Cookiebot consent**
  - **Severity**: Medium
  - **Where**: `src/layouts/BaseLayout.astro`
  - **Current danger**: GA loads and configures before Cookiebot, so analytics may run before visitor consent. This is a privacy/compliance risk, especially for GDPR/CCPA visitors.
  - **Fix**: Reordered so a Google Consent Mode default-deny script (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` all `'denied'`) runs first, then Cookiebot loads, then the gtag script and its config — the gtag script now carries `data-cookieconsent="statistics"` and the config script is `type="text/plain" data-cookieconsent="statistics"`, so Cookiebot's `data-blockingmode="auto"` holds both dormant until the visitor grants statistics consent. Added a CSP `sha256-...` hash in `vercel.json` for the consent-default script so it doesn't need `'unsafe-inline'` (documented in a code comment to regenerate the hash if the script content changes).
  - **Verification**: `pnpm run build` passes; confirmed via the built `dist/index.html` that script order is now consent-default → Cookiebot → gtag (tagged) → gtag config (`text/plain`, tagged), and that the CSP hash matches the actual rendered script content byte-for-byte. **Not yet verified live** — confirming no analytics events actually fire pre-consent, and that they do fire post-consent, needs a real browser + network tab against the deployed site.

- [x] **RSS XML injection advisory**
  - **Severity**: Medium
  - **Where**: `src/pages/rss.xml.js`, `@astrojs/rss@4.0.15`
  - **Current danger**: The installed RSS package version is affected by XML injection via unescaped RSS fields. The feed uses CMS-controlled title and description fields, so malformed or malicious XML can be generated.
  - **Fix**: Upgraded `@astrojs/rss` from `^4.0.1` (resolved 4.0.15) to `^4.0.19` (patched) in `package.json`; regenerated `pnpm-lock.yaml`.
  - **Verification**: `pnpm audit` no longer reports `@astrojs/rss`; confirmed `dist/rss.xml` parses as valid XML after `pnpm run build`.

- [x] **Sitemap XML injection or malformed XML from CMS slugs**
  - **Severity**: Medium
  - **Where**: `src/pages/sitemap.xml.js`, `studio/schemas/post.js`
  - **Current danger**: CMS slugs are interpolated directly into XML. A malicious or malformed slug can corrupt the sitemap or inject extra XML nodes, affecting crawler behavior and SEO integrity.
  - **Fix**: Added `Rule.required().custom(...)` validation to the `slug` field in `studio/schemas/post.js` restricting it to `^[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase letters, digits, hyphens only) — editors can no longer save a slug with XML/URL-breaking characters. Added `escapeXml()` plus `encodeURIComponent()` around the interpolated slug in `sitemap.xml.js` as defense in depth for any pre-existing data that predates the new validation.
  - **Verification**: `pnpm run build` passes; `dist/sitemap.xml` still parses as valid XML. Tested the escaping directly against `a"><script>alert(1)</script><x y="&z` — output is fully percent-encoded with no raw `<`, `>`, `&`, or `"` surviving.

- [ ] **Vision plugin enabled in all Studio environments** *(code change written, HELD — not committed, pending user verification)*
  - **Severity**: Medium
  - **Where**: `studio/sanity.config.js` (uncommitted local change as of this writing)
  - **Current danger**: Authenticated Studio users can run arbitrary GROQ queries through Vision within their permissions. Useful for developers, but too broad for production editorial environments.
  - **Fix (written, not yet committed)**: Changed `plugins: [deskTool(), visionTool()]` to `plugins: [deskTool(), ...(import.meta.env.DEV ? [visionTool()] : [])]` across all three workspaces (shared `commonConfig`). Sanity Studio's config is processed through Vite (confirmed `"vite": "^6.3.5"` in `studio/package.json`'s resolved deps), so `import.meta.env.DEV` is true under `sanity dev` and false under a `sanity build`/deployed build — Vision is excluded from the production bundle entirely, not just hidden.
  - **PENDING — action needed from you**: This change is deliberately **held out of the commit history** at your request until you can verify it yourself. Studio's build/dev commands are broken in this environment (the pre-existing `yargs`/Node v26 issue), so I could not run `sanity build` and inspect the output bundle for Vision's absence, or run `sanity dev` to confirm Vision still appears locally for developers. On a machine with a working Node LTS: run `sanity dev` and confirm Vision is still available, then run `sanity build` and confirm the Vision tool is absent from the production bundle/deployed Studio. Once confirmed, ask me to commit `studio/sanity.config.js`, or apply it yourself.
  - **Verification**: Not yet performed (see above).

- [ ] **DMARC policy is monitoring-only** *(deferred — see note)*
  - **Severity**: Medium
  - **Where**: DNS `_dmarc.ascentmgnt.com` currently returns `v=DMARC1; p=none; rua=mailto:dmarc@ascentmgnt.com`
  - **Current danger**: Spoofed email using the domain is easier to deliver because receivers are not instructed to quarantine or reject failing mail.
  - **What was found**: DNS is hosted on Vercel DNS (confirmed via `vercel dns ls ascentmgnt.com` — full add/remove access available). Mail is 100% Microsoft 365: SPF is `v=spf1 include:spf.protection.outlook.com -all` (no other senders, no wildcard), DKIM selectors point to Microsoft's own DKIM service — a clean, single-provider setup with no signs of shadow-IT senders.
  - **Why deferred**: The tracker's own fix guidance requires reviewing DMARC aggregate reports before tightening the policy, to confirm no legitimate sender would start failing. Those reports go to `dmarc@ascentmgnt.com`, a mailbox this session has no access to. Explicitly asked the site owner whether reports have been reviewed; they asked to defer this item rather than answer, so `p=none` is left unchanged rather than risk bouncing real mail on an unverified assumption.
  - **Fix (when ready)**: Review aggregate reports, confirm alignment, then move to `p=quarantine` first, `p=reject` later. I have the DNS access to apply this in one command once reports are reviewed.
  - **Verification**: DMARC TXT record shows `p=quarantine` or `p=reject`; reports continue showing legitimate mail alignment remains healthy.

## Low Priority And Hygiene

- [x] **Wildcard CORS on public static responses**
  - **Severity**: Low
  - **Where**: `vercel.json`, `studio/vercel.json`
  - **Current danger**: Any origin can read public static GET responses. This is low risk today because responses are public, and preflighted writes were not authorized, but it can become dangerous if private/API responses later inherit the same behavior.
  - **Fix**: Confirmed via `curl` that `Access-Control-Allow-Origin: *` was a Vercel platform default (present on the homepage, a static asset, and favicon.svg — not set anywhere in this repo), reproduced on both `ascentmgnt.com` and `studio.ascentmgnt.com`. Added an explicit `Access-Control-Allow-Origin` header in both `vercel.json` (→ `https://ascentmgnt.com`) and `studio/vercel.json` (→ `https://studio.ascentmgnt.com`), which takes precedence over the platform default.
  - **Verification**: Verified live against the **protected dev preview deployments** for both projects using `vercel curl` (per the `access-protected-vercel-deployment` skill, since preview URLs require Vercel SSO auth that plain `curl` can't pass): both now return their own canonical origin instead of `*`. Not yet re-verified against the production domains after merge to `main`.

- [ ] **Fake contact form success state**
  - **Severity**: Low security, medium business integrity
  - **Where**: `src/components/Contact.astro:96-111`
  - **Current danger**: The form prevents default submission, never sends data, and shows a success alert. Visitors can believe they contacted the business when no lead was captured.
  - **Fix**: Remove the fake form and rely on Calendly, or wire it to a real endpoint with server-side validation, rate limiting, spam protection, and privacy disclosure.
  - **Verification**: Success appears only after confirmed backend receipt, or the form is removed.

- [x] **Duplicate and global Calendly script loading**
  - **Severity**: Low
  - **Where**: `src/components/Header.astro`, `src/components/Contact.astro`
  - **Current danger**: The same third-party script loads globally and again on the contact page, increasing third-party execution surface and potential reliability issues.
  - **Fix**: Removed the duplicate `<script src="https://assets.calendly.com/assets/external/widget.js">` from `Contact.astro`. `Header.astro`'s copy (loaded globally via `BaseLayout` on every page) already scans the whole document for both `.calendly-trigger` and `.calendly-inline-widget` elements, so Contact's inline widget doesn't need its own copy.
  - **Verification**: `pnpm run build` passes; confirmed in the built `dist/contact/index.html` that the Calendly script now loads exactly once (was 2), while the `.calendly-inline-widget`/`.calendly-trigger` elements are still present and unchanged.

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

- [x] **Generated Sanity runtime files are tracked**
  - **Severity**: Low
  - **Where**: `studio/.sanity/runtime/app.js`, `studio/.sanity/runtime/index.html`
  - **Current danger**: Generated dev/runtime artifacts create drift and can accidentally expose generated internals or noisy changes.
  - **Fix**: Ran `git rm -r --cached studio/.sanity` and added `studio/.sanity/` to `.gitignore`. Files stay on disk (they're harmless regenerable build output, no need to delete locally), just no longer tracked.
  - **Verification**: `git ls-files 'studio/.sanity/**'` returns nothing; `git check-ignore -v studio/.sanity/runtime/app.js` confirms it now matches the new `.gitignore` rule.

- [x] **Astro generator version disclosure**
  - **Severity**: Low
  - **Where**: `src/components/SEO.astro`
  - **Current danger**: Public HTML exposes the exact Astro version, helping attackers correlate known advisories with the deployed site.
  - **Fix**: Removed `<meta name="generator" content={Astro.generator} />`.
  - **Verification**: `pnpm run build` passes; confirmed `dist/index.html` no longer contains a `name="generator"` meta tag.

- [x] **No public security disclosure contact**
  - **Severity**: Low
  - **Where**: `/.well-known/security.txt` returns 404
  - **Current danger**: Security researchers have no standardized contact or disclosure policy.
  - **Fix**: Added `public/.well-known/security.txt` (RFC 9116) with `Contact: mailto:noelsajor@gmail.com` (confirmed with the site owner — no other security/support contact existed anywhere in the codebase), `Expires` one year out, `Preferred-Languages: en`, and a `Canonical` URL.
  - **Verification**: `pnpm run build` passes; confirmed the file is copied verbatim into `dist/.well-known/security.txt`. Confirmed live via `curl -o /dev/null -w '%{http_code}' https://ascentmgnt.com/.well-known/security.txt` → `200`.

- [ ] **DNSSEC, MTA-STS, and TLS reporting are not configured** *(deferred — see note, three sub-items with different blockers)*
  - **Severity**: Low
  - **Where**: DNS records
  - **Current danger**: Domain and mail transport have less protection against DNS tampering and downgrade/visibility gaps.
  - **DNSSEC**: Checked `vercel dns`/`vercel domains inspect` for a signing/enable option — none found. Vercel DNS does not appear to support DNSSEC zone signing at all. Likely not actionable without moving DNS hosting elsewhere; needs further research or a different DNS provider, not just more access.
  - **TLS-RPT**: Low-risk, reporting-only (`_smtp._tls.ascentmgnt.com` TXT, doesn't affect mail delivery). Have the DNS access to add it in one command. Deferred at the site owner's request alongside the DMARC item rather than added piecemeal — revisit together.
  - **MTA-STS**: Bigger than a DNS record — needs hosting an actual policy file at `https://mta-sts.ascentmgnt.com/.well-known/mta-sts.txt` over HTTPS (a new subdomain + hosting), not just a TXT record. Not started; would need its own scoping.
  - **Fix**: See above, per sub-item.
  - **Verification**: DNSSEC validates, `_mta-sts` and `_smtp._tls` TXT records exist, and the MTA-STS policy file is reachable.

## Newly Discovered During Live Verification (2026-09-15)

Found while doing the live CSP browser check below — neither is a code/security fix, but both are real, live, user-facing issues surfaced by that work.

- [ ] **Cookiebot domain not authorized — consent banner never renders, GA never loads**
  - **Severity**: Medium (privacy/compliance UX + complete loss of analytics data, not a code vulnerability)
  - **Where**: Cookiebot Manager dashboard (external account setting, not in this repo)
  - **Current danger**: Live console shows `Error: The domain ASCENTMGNT.COM is not authorized to show the cookie banner for domain group ID 58f15ed1-...`. Confirmed via browser: no cookie banner renders on any page, and confirmed via network log that Google Analytics never loads at all (no `gtag.js` request, no collect calls) — the site's `data-cookieconsent="statistics"` gating (this session's own consent-ordering fix) is working exactly as designed, but since Cookiebot itself refuses to initialize for this domain, consent is never granted, so GA is permanently dark right now.
  - **Fix**: Log into the Cookiebot Manager, add `ascentmgnt.com` to domain group `58f15ed1-c576-4eef-b520-7d858bf813be`'s authorized domains list. Not a code change.
  - **Verification**: Reload the live site; the Cookiebot consent banner should appear; after accepting statistics, `gtag/js` and `google-analytics.com` collect requests should appear in the network tab.

- [x] **Calendly inline widget on /contact renders empty**
  - **Severity**: Low security, medium business integrity (same category as the fake contact form)
  - **Where**: `src/components/Header.astro`
  - **Root cause (code, not external)**: `widget.js` is loaded via a blocking, non-deferred `<script is:inline src="...">` inside `Header.astro`, which renders before `<main>` in the document. Confirmed via the built HTML that the script tag's byte offset (9111) comes before the `.calendly-inline-widget` div's offset (12126) in `dist/contact/index.html` — the script executes and runs Calendly's initial DOM scan for `.calendly-inline-widget` elements *before that div exists in the DOM*, so it's never found and no iframe gets created. Unlike the Cookiebot item, this is not an external account/dashboard problem — the markup itself (`class="calendly-inline-widget"`, `data-url`) exactly matches Calendly's documented embed convention.
  - **Fix**: Added `defer` to the script tag. Deferred scripts execute after the full document is parsed (all elements exist) but before `DOMContentLoaded`, which resolves the ordering race without needing to relocate the script out of `Header.astro` or touch the popup-trigger logic (which already checks `window.Calendly` lazily at click time, not at page-load time, so it was never affected by this ordering issue).
  - **Verification**: `pnpm run build` passes; confirmed `defer` is present on the script tag in the built HTML. Live re-verification pending merge to `main` (will reload `/contact` and confirm the Calendly scheduler iframe renders).

## Out-Of-Scope Validation Backlog

- [ ] **Authenticated Sanity roles and permissions**
  - **Danger if unresolved**: Overbroad editor/admin access can turn CMS compromise into stored XSS, data disclosure, or unauthorized content changes.
  - **How to solve**: Review Sanity project members, roles, tokens, CORS origins, dataset visibility, and deploy hooks. Enforce least privilege and rotate stale tokens.
  - **Verification**: Only required users and tokens remain; write tokens are scoped; untrusted origins are rejected.

- [ ] **Vercel project settings and environment variables** *(partially verified)*
  - **Danger if unresolved**: Misconfigured env vars, overly broad team access, leaked deploy hooks, or preview settings can expose secrets or deploy unsafe builds.
  - **How to solve**: Review Vercel team/project access, environment variables, deploy hooks, domains, preview protections, build logs, and integration permissions.
  - **Progress**: Checked via `vercel env ls` on both projects — root site only has `PUBLIC_SANITY_*` vars (project ID, dataset, API version, CDN flag), Studio only has `SANITY_STUDIO_*_PROJECT_ID`/`SANITY_STUDIO_DATASET`. Both sets are meant-to-be-public identifiers, not secrets, and no write tokens or API keys are exposed to either project — good least-privilege posture. Both projects run **Node 24.x LTS** (confirmed via the Vercel API), not this local machine's broken Node v26.7.0 — meaning several fixes reverted earlier in this session for local-build-breakage reasons (`@babel/core`/`js-yaml` overrides, Studio's `yargs` crash) likely aren't real problems in production and are worth retrying. Deployment protection: SSO enabled for preview URLs, correctly excluded for the custom domains (`ascentmgnt.com`, `studio.ascentmgnt.com`) — matches intended public-site/Sanity-gated-Studio design. Domains map correctly (one project per domain, no stray aliases). **Not yet verified**: deploy hooks (attempted via direct API call, got an auth error — the CLI's auto-injected auth apparently doesn't cover the general REST API the way it does deployment URLs; needs the Vercel dashboard or a properly authenticated API call), team member list/roles, and build log content for accidentally logged secrets.
  - **Verification**: Least-privilege project access (✅ confirmed for env vars); no stale deploy hooks (not yet checked); no secret values in logs (not yet checked); preview/production settings match policy (✅ confirmed).

- [ ] **Deployed Studio behavior and access control** *(partially verified)*
  - **Danger if unresolved**: A public Studio URL with weak controls increases phishing, clickjacking, content tampering, and authenticated app attack surface.
  - **How to solve**: Identify deployed Studio URL, verify Sanity auth, headers, allowed origins, Vision availability, workspace visibility, and no accidental open access.
  - **Progress**: Identified the deployed Studio URL (`studio.ascentmgnt.com`, Vercel project `ascent-web-test`). Confirmed live: it's excluded from Vercel's own SSO deployment protection (by design — custom domains are excluded so Sanity's own login is the actual gate), and visiting it unauthenticated shows only a login-provider chooser (Google/GitHub/email) with zero editorial data or console errors. **Not yet verified**: behavior once actually logged in (Vision availability per role, workspace visibility, whether normal editors can reach developer-only tools) — needs real Studio credentials this session doesn't have.
  - **Verification**: Unauthenticated users cannot access editorial data (✅ confirmed); normal editors cannot access developer-only tools (not yet checked); headers pass checks (✅ confirmed, see the Studio headers item above).

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
