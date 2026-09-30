# BillionPrompts.ai

This repository contains web experiences published by [BillionPrompts.ai](https://www.billionprompts.ai/). The current project is the **Hidden Fortune™ MVP**—a landing page and intake experience designed to turn selected conversations, notes, professional links, and personal goals into a human-reviewed Opportunity Blueprint.

## Current project

### Hidden Fortune™ MVP

The page in [`index.html`](./index.html) presents:

- the Hidden Fortune discovery process;
- the proposed Thought DNA™ and Opportunity Score™ concepts;
- the contents of an Opportunity Blueprint;
- an intake form for goals, conversation excerpts, links, document names, context, and consent; and
- privacy guidance for removing sensitive or confidential information before submission.

## Repository status

The `main` branch currently contains only `index.html`.

That file references `styles.css` and `app.js`, but those assets are not yet in the repository. As a result, the page content and basic HTML form can render, but the intended design and browser features—such as saving a private draft and creating a downloadable submission—are not available from this repository yet.

The form includes Netlify Forms attributes. Netlify can process that form after a Netlify deployment, but those attributes do not provide form handling on Hostinger or another ordinary static host. File contents are not uploaded by the present browser-only MVP.

## Use locally

1. Clone or download the repository.
2. From the project directory, start a local static server:

   ```bash
   python3 -m http.server 8000
   ```

3. Open [http://localhost:8000](http://localhost:8000).

For the complete intended experience, add the matching `styles.css` and `app.js` beside `index.html` before testing or publishing.

## Publish on BillionPrompts.ai

A subdirectory deployment is the safest way to preserve the existing main website:

1. Confirm that `index.html`, `styles.css`, and `app.js` are complete and tested together.
2. In Hostinger File Manager, open the document root for BillionPrompts.ai—commonly `public_html`.
3. Create a folder such as `hidden-fortune`.
4. Upload the three files into that folder without changing their names or relative paths.
5. Visit `https://www.billionprompts.ai/hidden-fortune/` and test the layout, navigation, required fields, consent checkboxes, draft saving, download behavior, and mobile view.

Do not replace the main site's existing `index.html` unless this project is intentionally becoming the BillionPrompts.ai homepage.

To receive submissions on Hostinger, connect the form to a secure server-side handler or approved form service and add a deletion-request process. Do not treat browser storage as a production database. If the project is deployed on Netlify instead, enable and test Netlify Forms in that site's dashboard.

## Privacy and production notes

- Ask users to remove passwords, payment information, medical records, government IDs, and confidential employer information.
- Never commit real customer submissions or secrets to this public repository.
- Add a clear privacy policy, retention period, deletion method, and secure submission workflow before collecting production data.
- Test accessibility, mobile behavior, and form failure states before launch.

## Contributing

Keep each published experience self-contained in its own folder, include every referenced asset, and update this README when a page is added, moved, or retired.
