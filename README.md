# BillionPrompts.ai

This repository contains web experiences for [BillionPrompts.ai](https://www.billionprompts.ai/). The project on this branch is **Hidden Fortune™**, a landing page and browser-only intake for selected conversations, notes, professional links, and personal goals. The proposed human-reviewed Opportunity Blueprint is described on the page; this MVP does not generate or deliver that report.

## Repository structure

| File | Purpose |
| --- | --- |
| `index.html` | Discovery process, proposed blueprint, intake, consent, and privacy guidance |
| `styles.css` | Responsive layout, cards, form styles, keyboard focus, and reduced-motion support |
| `app.js` | Optional local draft saving/restoration/deletion and local JSON downloads |
| `README.md` | Behavior, limitations, testing, and deployment instructions |
| `tests/browser.cjs` | Chromium regression checks for form behavior, privacy boundaries, failures, and layout |

No build step, external fonts, runtime dependencies, API keys, or backend are required. The prior `main` branch contained `index.html` and this README but lacked the referenced assets. Neither missing asset exists in the available commit history, so these are reconstructions from the HTML's classes, content, and promised browser behavior, not recovered originals. The separate `wordarena15` branch is unrelated and is preserved.

## Browser behavior

- **Save private browser draft** saves partial or completed text fields and document names to this browser's `localStorage`. Saving is explicit; edits are not automatically saved. The storage key is `billionprompts.hidden-fortune.draft.v1`.
- A saved draft is restored when you reopen this page on the same origin in the same browser profile. Consent is never saved or restored: review and check all three consent boxes again. Document names can be restored, but the actual file selection cannot.
- **Delete saved draft** removes only this project's saved draft. It leaves the current form, other sites' storage, and downloaded files intact. Clear or close the form separately if needed. **Clear document names** removes selected/restored document names; save again to update an existing draft.
- **Create my submission** requires a name, valid email, goal, three-year vision, all three consent checkboxes, and valid optional URLs. It prepares a UTF-8 JSON download and retains a visible download link if the browser blocks the automatic download. Editing the form hides the old link; create a new submission to include your changes.
- The export contains `schemaVersion`, `project`, `createdAt` (UTC ISO timestamp), `delivery: "local-download-only"`, the eight named text `fields`, `documentNames`, `fileContentsIncluded: false`, and three `consent` booleans. It is an intake snapshot, not an analysis or evidence that a submission was received.
- No file bytes are read or uploaded. No fetch, email, API, or form POST is made by the JavaScript. Storage failures and invalid drafts show actionable messages without disabling local downloads. If JavaScript is unavailable, action buttons stay disabled and a notice explains why.

“Private browser draft” means local to this browser, **not encrypted or protected from other people using it or scripts running on the same origin**. Avoid shared browsers for saving personal material. Drafts persist until deleted or browser site data is cleared; private browsing may discard them. Downloads contain the entered personal material and must be handled accordingly. Remove sensitive or confidential information before using the form. Never commit real submissions or secrets to this public repository.

## Use and test locally

From the project directory:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Check navigation, desktop/mobile layout, keyboard focus, required fields, each consent box, draft save/reload/delete, selected/restored/cleared file names, and the JSON download. Inspect the downloaded file and confirm that it contains names rather than file contents. Try blocked storage and JavaScript disabled as well.

For automated Chromium regression checks, keep that server running, install Playwright in a separate temporary test directory, and run:

```bash
mkdir -p /tmp/hidden-fortune-test-tools
npm install --prefix /tmp/hidden-fortune-test-tools playwright
/tmp/hidden-fortune-test-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/hidden-fortune-test-tools/node_modules node tests/browser.cjs
```

The tests use synthetic data, run against `http://127.0.0.1:8000`, and require Node.js 18+. Override the target with `HIDDEN_FORTUNE_TEST_URL` for another local origin. They check incomplete drafts, consent, exports, document-name handling, corrupt/blocked/full storage, download failure recovery, absence of form POSTs and remote requests, script-disabled behavior, mobile overflow, focus, and reduced motion. These checks do not verify backend reception or every browser.

## Publish on BillionPrompts.ai

Use a subdirectory to preserve the existing homepage:

1. Test `index.html`, `styles.css`, and `app.js` together.
2. In Hostinger File Manager, open the document root for BillionPrompts.ai (commonly `public_html`).
3. Create `hidden-fortune` and upload those **three runtime files** into it, keeping their names and relative paths. Do not upload tests or customer downloads.
4. Visit `https://www.billionprompts.ai/hidden-fortune/` and repeat the browser checks. Changing origin, browser, or profile does not transfer saved drafts.

Do not replace the main site's `index.html` unless Hidden Fortune is intentionally becoming the homepage. No hosting deployment is performed by this repository change.

## What still needs a backend

| Behavior | Current status / required work |
| --- | --- |
| Receive submissions on Hostinger | Unavailable. Needs a secure server-side handler or approved form service and a deliberate send action. |
| Netlify Forms | HTML attributes are retained, but JavaScript prevents POST on all hosts. Deploying on Netlify does **not** make this download action send data. To collect submissions, implement and test an explicit delivery flow and confirm reception in Netlify. |
| Upload/read document contents | Unavailable. Needs a file-processing/upload workflow with appropriate permissions, validation, limits, and storage. |
| Thought DNA™, Opportunity Score™, blueprint generation | Marketing concepts only. No analysis engine, scoring model, or AI integration exists here. |
| Human review, email, report delivery, customer tracking | Unavailable. Needs a service workflow and backend. |
| Server-side retention and deletion requests | Unavailable. Needs a privacy policy, retention rules, deletion method, and production data handling. Local deletion affects only the saved browser draft. |

## Contributing

Preserve unrelated projects. Keep future experiences in their own folders, include all referenced assets, and update this README when the structure or behavior changes.
