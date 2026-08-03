# Releases and GitHub Pages

This guide explains how Abos versions, publishes, deploys, and restores releases.

## Release model

`release` is a promotion branch. A merge into `release` prepares a release, but it does not deploy the application.

```text
feature branch -> main -> promotion PR -> release
                                      |
                                      v
                              Release Please PR
                                      |
                              maintainer merges it
                                      |
                                      v
                     Git tag + GitHub Release + Pages
```

Release Please reads commits on `release`. It creates or updates a release PR. When a maintainer merges this release PR, Release Please creates an immutable Git tag and a GitHub Release. The same workflow then calls the Pages deployment workflow with that tag.

The deployment checks out the tag, not the current branch head. The deployed files can therefore be traced to one exact release.

## Version rules

The project uses Semantic Versioning in the form `MAJOR.MINOR.PATCH`. Git tags add a `v` prefix, for example `v0.3.1`.

Before `1.0.0`, use these rules:

| Change | Commit example | Version result |
| --- | --- | --- |
| Compatible bug fix | `fix: correct renewal date` | `0.3.0` to `0.3.1` |
| Compatible feature | `feat: add renewal alert` | `0.3.1` to `0.4.0` |
| Breaking change | `feat!: change snapshot format` | `0.3.1` to `0.4.0`, marked as breaking |
| Documentation or maintenance only | `docs:` or `chore:` | No release by itself |

After `1.0.0`, a breaking change increments MAJOR.

Never move, delete, or reuse a published tag. Publish a new patch release to correct a bad release.

The following versions are independent:

- application release, such as `0.4.0`;
- Git tag, such as `v0.4.0`;
- Dexie schema version in `src/data/db.ts`;
- snapshot format version in `src/services/snapshot.ts`.

A change to the Dexie schema does not require the same application version number.

## Conventional Commits

Release Please uses Conventional Commits to select the next version and write `CHANGELOG.md`.

Use at least these commit types:

```text
fix: correct a user-visible defect
feat: add backward-compatible behavior
feat!: introduce an incompatible behavior
docs: update documentation only
chore: maintain tooling without product behavior changes
```

A breaking change can also use a footer:

```text
feat: change snapshot validation

BREAKING CHANGE: snapshots older than version 2 are no longer accepted.
```

When pull requests are squash-merged, the pull request title becomes the commit subject. Make the title conform to the same convention.

## Files in this repository

- `release-please-config.json` defines the Node release strategy, `v` tags, and the pre-1.0 version policy.
- `.release-please-manifest.json` records the current released version.
- `.github/workflows/release.yml` prepares releases from the `release` branch and calls deployment only when a release was created.
- `.github/workflows/deploy-pages.yml` validates, builds, and deploys an existing release tag. It also supports manual restoration.
- `package.json` contains the application version updated by the release PR.
- `CHANGELOG.md` is created and maintained by Release Please after automated release preparation starts.

Do not edit a generated release PR only to change the proposed version. If an exceptional version is required, use Release Please's `Release-As: X.Y.Z` commit footer and explain the reason in the pull request.

## Required GitHub repository settings

Complete these settings before the first deployment.

### Actions

In **Settings > Actions > General**:

1. Allow the actions used by both workflow files.
2. Give workflows read and write permissions where the repository policy requires it.
3. Enable **Allow GitHub Actions to create and approve pull requests** so Release Please can open its PR.

The workflows still declare permissions per job. Release Please receives `contents: write`, `issues: write`, and `pull-requests: write`. The deployment receives `pages: write` and `id-token: write`.

### Public Dexie Cloud configuration

In **Settings > Secrets and variables > Actions > Variables**, create this repository variable:

```text
VITE_DEXIE_CLOUD_URL=https://YOUR_DATABASE.dexie.cloud
```

This URL is public. Vite includes it in browser JavaScript. Never put a Dexie Cloud machine secret, an n8n credential, `dexie-cloud.key`, or any other secret in a `VITE_*` variable.

The workflow stops before the build when this variable is empty.

### GitHub Pages

In **Settings > Pages**:

1. Set **Build and deployment > Source** to **GitHub Actions**.
2. Keep the generated environment name `github-pages`.
3. If deployment protection rules are used, allow deployments from `release`.

The application already uses relative Vite assets and hash navigation. A repository site such as `https://OWNER.github.io/REPOSITORY/` does not need a custom `404.html` fallback.

### Branch protection

Create and protect the `release` branch:

- require a pull request before merging;
- block direct pushes and force pushes;
- require the normal CI checks used by the project;
- do not allow tag deletion or tag rewriting as part of the release procedure.

The branch protection is the guarantee that every normal promotion and every release decision is reviewed.

## One-time bootstrap for v0.1.0

The repository starts at version `0.1.0`, but it has no historical tag. The first tag establishes the baseline used by Release Please.

Do this only after the release workflows have been merged into `main` and all checks pass.

1. Make sure the local `main` branch contains the exact baseline to publish.
2. Run the local validation:

   ```powershell
   $env:VITE_DEXIE_CLOUD_URL='https://YOUR_DATABASE.dexie.cloud'
   $env:VITE_APP_VERSION='0.1.0'
   $env:VITE_APP_ENVIRONMENT='production'
   pnpm lint
   pnpm test
   pnpm build
   ```

3. Create `release` and the annotated tag on the same commit:

   ```powershell
   git switch -c release
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push -u origin release v0.1.0
   ```

   Push the branch and tag together. This lets the first `release` workflow see the baseline tag and prevents the complete pre-release history from being proposed as a new version.

4. Create the initial GitHub Release:

   ```powershell
   gh release create v0.1.0 --target release --title "v0.1.0" --generate-notes
   ```

5. Open **Actions > Deploy release to GitHub Pages > Run workflow**.
6. Select the `release` branch and enter `v0.1.0` as `release_tag`.
7. Verify the deployed URL and the diagnostic dialog as described below.

Do not change `.release-please-manifest.json` after this bootstrap. Release Please updates it in later release PRs.

## Publish a normal release

Use this checklist for every release after `v0.1.0`.

1. Confirm all intended changes are merged into `main` with Conventional Commit subjects.
2. Open a promotion PR from `main` to `release`.
3. Review CI, migration notes, snapshot compatibility, and release risk.
4. Merge the promotion PR.
5. Wait for **Prepare and publish release** to create or update the Release Please PR against `release`.
6. Review the proposed version and `CHANGELOG.md`.
7. Merge the Release Please PR when the version is ready for production.
8. Wait for the same workflow to create the tag and GitHub Release.
9. The workflow calls **Deploy release to GitHub Pages** with the new tag.
10. Verify the deployed application.

A promotion merge alone must not start a Pages deployment. If it does, stop and correct the workflow before publishing another release.

## Verify a deployment

Check all of the following:

1. The GitHub Release and Git tag have the same version.
2. The tag points to the commit containing the expected `package.json` version and changelog entry.
3. The Pages deployment is linked to the successful workflow run.
4. The application loads from the repository Pages URL.
5. Open the information icon in the top bar.
6. Confirm **Version applicative** equals the tag without `v`.
7. Confirm **Environnement** equals `production`.
8. Confirm Dexie Cloud login and synchronization use the intended production database.

For example, deployment of `v0.4.2` must display version `0.4.2` and environment `production`.

## Restore an older release

Restoration redeploys an existing immutable tag. It does not move the tag and does not create a fake replacement release.

1. Identify the last known good tag in GitHub Releases.
2. Check the Dexie migration notes between the current release and that tag.
3. If the newer release performed a non-backward-compatible Dexie migration, do not assume that an older frontend can read the migrated database. Export or restore a compatible snapshot first when the relevant change documentation requires it.
4. Open **Actions > Deploy release to GitHub Pages > Run workflow**.
5. Select the `release` branch.
6. Enter the existing tag, for example `v0.4.1`.
7. Wait for lint, tests, build, and deployment to complete.
8. Verify that the diagnostic displays `0.4.1` and `production`.

The manual workflow rejects branch names, commit SHAs, moving labels such as `latest`, and malformed versions. Only an existing `vMAJOR.MINOR.PATCH` tag can be deployed.

After service is restored, fix the defect on `main` and publish a new version through the normal process.

## Common failures

### No release PR appears

- Check that the commit reached `release`.
- Check that at least one commit has a release-producing type such as `fix:` or `feat:`.
- Check the Release Please job permissions and repository Actions settings.
- Confirm that `v0.1.0` exists before expecting versions after the bootstrap.

### The release exists but Pages was not deployed

- Open the release workflow run and confirm `release_created` was true.
- Check that the called workflow received the generated `tag_name`.
- Check Pages and `github-pages` environment permissions.
- Check that `VITE_DEXIE_CLOUD_URL` is present as a repository variable.

### Build reports an outdated pnpm lockfile

Run `pnpm install` on the release PR branch, commit the legitimate lockfile update, and let all checks run again. Do not bypass `--frozen-lockfile` in the release workflow.
