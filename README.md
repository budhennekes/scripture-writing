# Scripture, by hand

A simple web companion for handwriting Scripture. No account, backend profile, analytics, or subscription.

## Use it

Public MVP: https://budhennekes.github.io/scripture-writing/

- Choose WEB, Berean Standard Bible (BSB), or American Standard Version (1901).
- Enter a passage such as `John 3:16`, or browse by book, chapter, and verse.
- Write on paper. Use Space, arrows, or the large Next control to advance.
- Choose your writing hand in settings to position controls on the other side.
- Choose **Enter writing mode** for browser fullscreen, with a full-viewport fallback where unsupported. **Exit writing mode** and Escape return to the normal reader. The compact passage heading, page-edge bookmark ribbon, and chapter-position rule remain visible. Scripture stays still; arrows continue after toolbar actions, and pointer clicks return focus to the text so Space continues writing.
- Turn on **Line guide**, then click a line or use up/down while the text is focused to move a fine margin marker. Navigation controls give brief keyboard feedback; Scripture stays still. Reduced-motion preferences are respected.
- Adjust type size and choose **White**, **Soft gray**, **Pale sage**, or **Night** in settings. Background choices are saved locally; existing Paper settings become White.
- Subtle, transparent Back/Next controls stay on your free-hand side. The thin bottom line shows chapter position, not completion; its reference stays visible in writing mode.

Your place and bookmarks are stored in this browser, separately for each translation. They do not sync between devices; clearing browser storage removes them. Moving from the local prototype to the public URL does not transfer local saves. Focus and line guide are session controls. Offline support is available after a successful online load and service-worker installation. Browser support for fullscreen and screen wake lock varies.

All bundled editions contain the 66-book Protestant canon. They do not include Deuterocanonical books. Verse numbering can differ between translations; the app uses reference-based positions rather than assuming matching array offsets.

## Random verse

Open the passage chooser and select **Write a random verse**. This draws from the current translation, excluding the currently displayed starting verse. The one/two-verse preference still applies. Random exploration and its Next/Back navigation do not overwrite your saved sequential place. Use **Return to saved place** in the chooser, or reload to resume it. Bookmarks made while exploring are retained. Choosing a specific passage ends exploration and saves that new position.

## Visual setting

The reader defaults to one verse, with an optional two-verse view in Settings. A or Left Arrow goes back; D, Space, or Right Arrow advances past the displayed verses. A dismissible keyboard hint and verse-count preference save locally. The reader uses one compact row: passage/translation chooser, writing mode, and settings. Duplicate selectors and surrounding verses are removed. Next has a large free-hand target with Back separated above it; writing-hand preference mirrors the controls. Line guide is in settings. The reader is a bounded writing sheet within original Christian chapel imagery. A cross belongs to the architecture rather than UI decoration. The passage picker and settings share the same visual system; dialogs trap keyboard focus and return it to Scripture on dismissal. Focus fades out the landscape without moving the text. Background choices use cool mineral tones; Night uses midnight blue. All motion respects reduced-motion settings. The image is bundled locally and cached for offline use.

## Current acceptance gate

Run `npm run qa` (handwriting flow), `node scripts/readability_qa.mjs`, and `node scripts/reference_picker_qa.mjs`. Older browser/release/writing-layout tests retain selectors from the superseded multi-toolbar interface and are historical, not release gates.

## Development

```sh
npm ci
npm run dev
```

For production preview and checks:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# In another terminal:
npm run lint
npm run qa
node scripts/mvp_qa.mjs
node scripts/readability_qa.mjs
node scripts/minimal_ui_qa.mjs
node scripts/design_matrix.mjs
node scripts/persistence_qa.mjs
node scripts/release_qa.mjs
python3 scripts/data_qa.py
```

Browser tests use an isolated headless Google Chrome instance. The release test also supports `QA_URL` and `CHROME_PATH`.

## Public deployment

Source lives on `main`; compiled static assets are deployed to `gh-pages`. Publishing requires repository access and explicit approval.

```sh
DEPLOY_BASE=/scripture-writing/ npm run build
python3 scripts/deploy_pages.py
QA_URL=https://budhennekes.github.io/scripture-writing/ node scripts/release_qa.mjs
```

GitHub Pages must serve `gh-pages` from `/`. Do not deploy `.env` files, browser data, source downloads, or QA artifacts.

## Bible sources and permissions

- **World English Bible**: https://ebible.org/engwebp/ — public domain. “World English Bible” is a trademark of eBible.org.
- **American Standard Version (1901)**: https://ebible.org/asv/copyright.htm — public domain.
- **Berean Standard Bible**: https://berean.bible/terms.htm — dedicated to the public domain (CC0). Produced in cooperation with Bible Hub, Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee.

Data comes from official eBible.org USFX downloads. Footnotes and editorial headings are excluded from the copying text. To regenerate:

```sh
python3 scripts/build_bible.py WEB
python3 scripts/build_bible.py ASV1901
python3 scripts/build_bible.py BSB
python3 scripts/data_qa.py
```
