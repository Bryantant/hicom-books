# Hicom Books branding changes

Every change that branch `hicom-16` makes to upstream Frappe Books `version-16`. After merging an upstream
release, check this list, rebuild the frontend and run the checks at the end.

Goal: a client user sees "Hicom Books" and the Hicom logo on every screen, and never the upstream name or logo.
Technical names that only show in browser developer tools stay as they are: the Python package `frappe_books`,
`/assets/frappe_books/...`, API paths, the module name `Frappe Books`, `Books *` DocType names and `X-Frappe-*`
headers. Renaming them would make every upstream merge a large one.

## Hicom-only files

| File | Purpose |
|---|---|
| `frontend/src/utils/hicomBrand.ts` | Product name, docs base URL (`https://docs.books.hicomsystem.com/`), source URL, `getDocsUrl()` (drops the `books/` prefix, adds `id/` for Indonesian users) |
| `frappe_books/hicom/branding.py` | `apply_branding()`: Website, System and Navbar Settings for the login, password, message and error pages, emails and the default app. Runs on install and on every migrate |
| `frappe_books/hicom/guard.py` | `before_request`: everyone but Administrator is redirected from `/desk`, `/app`, `/apps`, `/attribution`, `/me`, `/update-profile` to `/books` |
| `frappe_books/hicom/response.py` | `after_request`: removes the `<meta name="generator" content="frappe">` tag that the framework's `templates/base.html` hardcodes into the login, password, message and error pages |
| `frappe_books/tests/test_hicom.py` | Tests for the three modules above |
| `frontend/scripts/check-branding.mjs` | Leak scanner: visits every page a client user reaches and fails on the upstream name or logo |
| `BRANDING.md`, top of `README.md` | This list, and the AGPL modification notice |

## Changed upstream files

| File | Change |
|---|---|
| `frappe_books/hooks.py` | `app_title`, `app_publisher`, `app_description`, `app_email`; `apply_branding` in `after_install` and `after_migrate`; `before_request` guard; `after_request` meta tag removal |
| `frontend/index.html` | `<title>` and `apple-mobile-web-app-title`: Hicom Books |
| `frontend/src/utils/appMenu.ts` | Help heading `Hicom Books <version>`, docs via `getDocsUrl`, "License & Source Code" dialog (`showLicense`), "Apps" item only for Administrator |
| `frontend/src/components/SearchBar.vue` | Search title, docs via `getDocsUrl` |
| `frontend/src/utils/getStartedConfig.ts` | Get Started docs links via `getDocsUrl` |
| `frontend/src/web/WebApp.vue`, `src/mobile/search/MobileSearch.vue`, `src/components/ShortcutsHelper.vue`, `src/pages/Settings/useSettings.ts`, `reports/commonExporter.ts` | "Frappe Books" → "Hicom Books" in user-facing strings |
| `frappe_books/public/pwa/manifest.json` | `name`, `short_name`: Hicom Books |
| `frappe_books/pwa/service_worker.js` | Offline page title and text |
| `frappe_books/public/books-icon.png`, `public/pwa/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Hicom logo (purple `#4909c8`) |
| `frappe_books/frappe_books/doctype/books_setup_wizard/books_setup_wizard.py`, `.js` | Setup complete messages |
| `frappe_books/frappe_books/workspace/books/books.json` | Workspace header |
| `frappe_books/frappe_books/doctype/books_system_settings/books_system_settings.json`, `books_print_settings/books_print_settings.json` | Field help text no longer names the framework |
| `frappe_books/locale/*.po`, `main.pot` | "Frappe Books" → "Hicom Books" |
| `frontend/tests/app-menu.test.mjs`, `tests/ui/mobile-search.spec.ts`, `tests/ui/document-save-warnings.spec.ts` | Expected strings and docs URLs |

## Checks after every change or upstream merge

```bash
yarn --cwd frontend test
yarn --cwd frontend build
grep -rlI "Frappe Books\|docs\.frappe\.io" frappe_books/public/books frappe_books/www/books.html   # only the module name may remain
```

Run `frappe_books.tests.test_hicom` with the stdlib `unittest` runner from a `bench execute` script, not with
`bench run-tests`: on a site with data, `run-tests` first loads the framework's test fixtures into it.

Then run the leak scanner against a live site, as a client user (not Administrator):

```bash
cd frontend
BRANDING_URL=http://books.localhost:8301 BRANDING_USER=<books user> BRANDING_PASSWORD=<password> \
BRANDING_BROWSER_CHANNEL=chrome node scripts/check-branding.mjs
```
