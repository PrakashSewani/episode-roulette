# Release and Publishing

## Version

`package.json` is the sole canonical product version source. `src/manifest.ts` reads the version at build time and injects it into the emitted `manifest.json`. Safari synchronization derives both native targets' `MARKETING_VERSION` from the same package version.

To release a new version:

1. Update `version` in `package.json`.
2. Commit the change.
3. Tag the commit: `git tag v1.0.0 && git push origin v1.0.0`.

The `Release` GitHub Actions workflow triggers on `v*` tags and publishes to the Chrome Web Store.

### Release ordering

Pushing a `v*` tag publishes live, so everything the release depends on must already be deployed:

1. Deploy the `episode-roulette-website` worker first and confirm the routes the release uses respond with `200`.
2. Bump `version` in `package.json`, commit, and push `main`.
3. Run the full gate: `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run assert:webextension`.
4. Tag and push the tag.

The onboarding hooks in `src/background.ts` open `https://episode-roulette.prakashsewani.com/thanks` on install and register `https://episode-roulette.prakashsewani.com/uninstalled` for uninstall. Both routes must be live before the tag is pushed, or new users land on an error page.

---

## Chrome Web Store Publishing

### Required Repository Secrets

Add these four secrets in **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret | Description |
|--------|-------------|
| `CHROME_EXTENSION_ID` | The 32-character item ID from your Chrome Web Store Developer Dashboard URL (e.g., `abcdefghijklmnopqrstuvwxyz123456`) |
| `CHROME_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `CHROME_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console |
| `CHROME_REFRESH_TOKEN` | OAuth 2.0 refresh token generated from the Client ID and a one-time consent flow |

### How to Obtain Each Secret

#### 1. `CHROME_EXTENSION_ID`

1. Upload your extension to the Chrome Web Store Developer Dashboard at least once (manual upload for the first release).
2. Open the dashboard at `https://chrome.google.com/webstore/devconsole/`.
3. Click your extension item.
4. The URL contains `.../edit/<extension-id>` — copy the ID string.

#### 2. `CHROME_CLIENT_ID` and `CHROME_CLIENT_SECRET`

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project. Confirm the project selector in the top bar shows that project before continuing.
3. Enable the **Chrome Web Store API**:
   - Navigate to **APIs & Services → Library**.
   - Search for "Chrome Web Store API" and click **Enable**.
4. Configure the OAuth consent screen (required before an OAuth client can be created):
   - Navigate to **APIs & Services → OAuth consent screen**.
   - Choose **External**, then fill in the app name, user support email, and developer contact email.
   - Under **Test users**, add the Google account that owns the Chrome Web Store item.
   - See the testing-mode caveat under `CHROME_REFRESH_TOKEN` below.
5. Create OAuth credentials:
   - Navigate to **APIs & Services → Credentials**.
   - Click **Create Credentials → OAuth client ID**.
   - Select **Web application** as the application type.
   - Add `https://developers.google.com/oauthplayground` to **Authorized redirect URIs**. This exact value is required; the scope error described below is unrelated to it, but a missing redirect URI blocks the authorize step outright.
   - Click **Create**.
   - Copy the **Client ID** and **Client Secret** shown in the dialog.

#### 3. `CHROME_REFRESH_TOKEN`

1. Go to the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon (top right) and check **Use your own OAuth credentials**.
3. Set **Access type** to **Offline**. Without this the playground does not return a refresh token.
4. Enter your `CHROME_CLIENT_ID` and `CHROME_CLIENT_SECRET`, then close the dialog.
5. In **Step 1**, scroll past the API list to **Input your own scopes** and enter exactly:
   `https://www.googleapis.com/auth/chromewebstore`
   Do not select an API from the list instead. A near-miss scope string fails with "your input OAuth2 scope name is invalid or it refers to a newer scope that is outside the domain of this legacy API".
6. Click **Authorize APIs** and consent with the Google account that owns the Chrome Web Store item. An "unverified app" warning is expected for a self-owned client; continue past it.
7. In **Step 2**, click **Exchange authorization code for tokens**.
8. Copy the **Refresh token** value.

Testing-mode caveat: an OAuth consent screen left in **Testing** status issues refresh tokens that Google expires after roughly seven days, which shows up later as the `Release` workflow failing on the token exchange. Either publish the consent screen to **In production** (Google may require verification for this scope) or expect to regenerate the refresh token periodically.

Treat `CHROME_CLIENT_SECRET` and `CHROME_REFRESH_TOKEN` as secrets. Set them through the GitHub repository settings UI, or with `gh secret set`, which prompts for the value instead of taking it on the command line.

A refresh token from a consent screen in production status does not expire. Store it as the `CHROME_REFRESH_TOKEN` secret.

### Release Workflow

The `Release` workflow (`.github/workflows/release.yml`) runs on `v*` tag pushes and manual dispatch:

1. Checks out the repository.
2. Installs dependencies with `npm ci`.
3. Runs tests (`npm test`).
4. Builds the universal WebExtension (`npm run build`).
5. Asserts the package (`npm run assert:webextension`).
6. Publishes to Chrome Web Store (`npm run publish:chrome`).

The `publish-chrome.mjs` script:
- Validates all four secrets are present.
- Zips `dist/webextension/` into `episode-roulette-v<version>.zip`.
- Exchanges the refresh token for an access token via the Google OAuth2 API.
- Uploads the zip to the Chrome Web Store Upload API.
- Publishes the uploaded package to the `trusted` channel.

### Manual Publish

You can also publish locally if the four environment variables are set:

```bash
CHROME_EXTENSION_ID=... CHROME_CLIENT_ID=... CHROME_CLIENT_SECRET=... CHROME_REFRESH_TOKEN=... npm run publish:chrome
```

---

## Safari Publishing

Safari extension publishing requires an Apple Developer Program membership and is not automated in CI. The unsigned Safari wrapper build (`npm run safari:build`) produces a local Xcode project that must be opened, signed with your development team, archived, and submitted to the App Store via Xcode or `xcrun altool`.

**Safari publishing is deferred by user decision (2026-08-16)** until enough requests or donations justify its cost. Do not run Safari release gates for the current Chrome Web Store release. When Safari scope re-opens, follow `docs/safari.md` for the Safari packaging and signing workflow.
