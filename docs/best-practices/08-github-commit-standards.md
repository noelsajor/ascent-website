# GitHub Workflow & Commit Standards

When working in an agency environment or cloning templates across multiple brands, a strict Git workflow is essential to track changes, rollback errors, and safely deploy new features without breaking production.

## 1. Branch Naming Strategy

Main branches (`main` or `master`) must always mirror your Vercel production deployment. Never commit directly to `main` unless it's a minor hotfix.

**Always branch off `main` before starting work.** Use the following prefix conventions for branches:
- `feat/`: A new feature (e.g., `feat/add-testimonial-carousel`)
- `fix/`: A bug fix (e.g., `fix/mobile-menu-overflow`)
- `chore/`: Maintenance tasks (e.g., `chore/dependency-updates`)
- `docs/`: Writing or updating documentation (e.g., `docs/update-readme`)
- `clone/`: Branch used for the initial setup of a new brand (e.g., `clone/setup-new-brand-assets`)

## 2. Conventional Commits

Commit messages act as the "changelog" for your project. We follow the **Conventional Commits** specification.
A commit message should consist of a type, an optional scope, and a subject.

**Format:**
```
<type>(<scope>): <subject>
```

**Types:**
- `feat`: A new feature or major UI component.
- `fix`: A bug fix.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, CSS styling tweaks).
- `refactor`: A code change that neither fixes a bug nor adds a feature (e.g., renaming a variable, moving a component).
- `perf`: A code change that improves site performance.
- `build`: Changes that affect the build system or external dependencies (Vercel, pnpm).

**Examples of Good Commits:**
✅ `feat(header): add dynamic background transparency on scroll`
✅ `fix(seo): correct canonical URL fallback logic in BaseLayout`
✅ `style(css): adjust primary button padding for mobile views`

**Examples of Bad Commits:**
❌ `fixed stuff`
❌ `wip`
❌ `updated CSS and also added a new page and fixed the footer link` (Too large; split this into multiple commits).

## 3. Commit Sizing

- **One logical change per commit.** Do not bundle a CSS styling fix on the Footer with a massive new API fetching logic script in Sanity. 
- Keeping commits small allows you to `git revert` specific broken code without nuking half a day's worth of other, functional work.

## 4. Pull Requests (PRs) & Code Reviews

When your feature branch is ready:
1. Open a Pull Request targeting `main`.
2. Use the PR description to explain the *Why* of the change, not just the *What* (since the code shows the what).
3. **Always trigger a Vercel Preview Deployment** and click through the preview URL before merging to ensure the live build environment hasn't surfaced any hidden Astro hydration errors.

## 5. Handling `.env` Files

- **CRITICAL**: Never execute a `git add .` without first ensuring that your `.env` or `.env.local` files are successfully listed in your `.gitignore` file.
- If you add a new required environment variable to the project, add a dummy version of it to `.env.example` and commit the example file so other developers know what keys they need to scaffold their local enviroments.

## 6. Branch Protection (`main`)

As of the September 2026 security audit remediation, `main` has GitHub branch protection enabled (applied via `gh api repos/<owner>/<repo>/branches/main/protection`, verifiable with `gh api repos/<owner>/<repo>/branches/main/protection`):

- **Pull requests required** — direct `git push` to `main` is rejected for non-admin collaborators.
- **1 approving review required**, with stale reviews auto-dismissed when new commits are pushed to the PR.
- **Conversation resolution required** before a PR can merge.
- **Force pushes blocked** and **branch deletion blocked** — for everyone, no exceptions.
- **Admins are exempt** (`enforce_admins: false`) — the repo owner can still push directly to `main` for the rare documented hotfix case (section 1) or the `git push origin main` bootstrap step in `DEPLOYMENT_GUIDE.md`. This is a deliberate choice for this solo/small-team repo, not an oversight — treat it as a break-glass exception, not the default workflow.
- **No required status checks yet** — there's no CI configured in this repo. Once CI exists (tracked separately in the security tracker), required status checks should be added here too.

If you clone this repo for a new brand, re-apply the same protection on the new repo's `main` branch — it does not carry over automatically via `git push` or a GitHub template.
