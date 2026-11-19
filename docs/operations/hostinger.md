# Hostinger deployment

Use the GitHub branch containing the production entry file. The Hostinger build must run the npm build script, which emits `dist/web` and `dist/server`. Use the **Other** preset if **Express** hides the Build command field. Select Node **22.x**, npm, root **./**, build command **npm run build** and entry **server.js**. If prompted for a start command, select **npm start**. Keep the Node app rooted in the repository so both build directories and the source public assets remain available.

| Environment variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `API_HOST` | `0.0.0.0` |
| `API_PORT` | `3000` as fallback. The server uses Hostinger's `PORT` when provided. |
| `APP_ORIGIN` | The final HTTPS URL without a trailing slash, for example `https://crm.example.com` |
| `NPM_CONFIG_INCLUDE` | `dev`, to include Vite and TypeScript during the build |
| `DB_HOST` | `127.0.0.1` for the database on the same Hostinger plan |
| `DB_PORT` | `3306` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database name, user and password assigned in hPanel, including any hosting prefixes |
| `INTEGRATION_SECRET_KEY` | Persistent 32-byte key as 64 hexadecimal characters. Preserve the original key when moving an installation with saved integration credentials. |
| `QUOTATION_MEDIA_DIRECTORY` | Private writable path outside the deployment directories, persistent across releases |
| `PDF_CHROMIUM_PATH` | Optional existing server Chromium executable |

Use the ordinary runtime database account in the web app. Run the versioned migrations with the database maintenance identity or import a migrated database backup that includes `schema_migrations`. A new database also needs its initial administrator using the existing bootstrap command. Keep migration credentials outside the web app. Back up the database, encryption key and quotation media together when moving an existing installation. A new encryption key can be generated with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

After deployment, check `/api/health`, sign in over HTTPS and load a direct route such as `/customers`. Verify quotation media persistence across redeployments and verify the Chromium executable before advertising PDF downloads.

[Hostinger Node.js deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) · [Hostinger MySQL connection](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/)
