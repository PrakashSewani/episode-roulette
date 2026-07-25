# Release and Publishing

## Version

`package.json` is the sole canonical product version source. `src/manifest.ts` reads the version at build time and injects it into the emitted `manifest.json`. Safari synchronization derives both native targets' `MARKETING_VERSION` from the same package version.

To release a new version:

1. Update `version` in `package.json`.
2. Commit the change.
3. Tag the commit: `git tag v1.0.0 && git push origin v1.0.0`.

The `Release` GitHub Actions workflow triggers on `v*` tags and publishes to the Chrome Web Store.

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
2. Create or select a project.
3. Enable the **Chrome Web Store API**:
   - Navigate to **APIs & Services → Library**.
   - Search for "Chrome Web Store API" and click **Enable**.
4. Create OAuth credentials:
   - Navigate to **APIs & Services → Credentials**.
   - Click **Create Credentials → OAuth client ID**.
   - Select **Web application** as the application type.
   - Add `https://developers.google.com/oauthplayground` to **Authorized redirect URIs**.
   - Click **Create**.
   - Copy the **Client ID** and **Client Secret** shown in the dialog.

#### 3. `CHROME_REFRESH_TOKEN`

1. Go to the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon (top right) and check **Use your own OAuth credentials**.
3. Enter your `CHROME_CLIENT_ID` and `CHROME_CLIENT_SECRET`.
4. In the **Scopes** field on the left, enter: `https://www.googleapis.com/auth/chromewebstore`
5. Click **Authorize APIs** and consent with the Google account that owns the Chrome Web Store item.
6. After authorization, click **Exchange authorization code for tokens**.
7. Copy the **Refresh token** value.

The refresh token does not expire. Store it as the `CHROME_REFRESH_TOKEN` secret.

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

See `docs/safari.md` for the Safari packaging and signing workflow.
