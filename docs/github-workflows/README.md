# GitHub Actions workflows (to install)

These belong in `.github/workflows/`. They live here because the automated session that created
the project could not write workflow files (its GitHub token lacked the `workflow` scope).

To install: move both files into `.github/workflows/` (locally with `git mv`, or on github.com
via "Add file → Create new file" and paste), then in the repo **Settings → Pages → Build and
deployment → Source** choose **GitHub Actions**.

- `deploy.yml` — on every push to `master`: typecheck, validate content, test, build, deploy.
- `ci.yml` — the same checks on pull requests and other branches.
