# Scripture, by hand

A simple web companion for handwriting Scripture. No account, backend profile, analytics, or subscription.

## Use it

Public MVP: https://budhennekes.github.io/scripture-writing/

- Choose WEB, Berean Standard Bible (BSB), American Standard Version (1901), or Douay-Rheims 1899 (Catholic).
- Enter a passage such as `John 3:16`, or browse by book, chapter, and verse.
- Write on paper. Use Space, arrows, or the large Next control to advance.
- Choose your writing hand in settings to position controls on the other side.
- Choose **Enter writing mode** for browser fullscreen, with a full-viewport fallback where unsupported. **Exit writing mode** and Escape return to the normal reader. The compact passage heading, page-edge bookmark ribbon, and chapter-position rule remain visible. Scripture stays still; arrows continue after toolbar actions, and pointer clicks return focus to the text so Space continues writing.
- Turn on **Line guide**, then click a line or use up/down while the text is focused to move a fine margin marker. Navigation controls give brief keyboard feedback; Scripture stays still. Reduced-motion preferences are respected.
- Adjust type size and choose **White**, **Soft gray**, **Pale sage**, or **Night** in settings. Background choices are saved locally; existing Paper settings become White.
- A filled Next button and outlined Back button stay on your free-hand side. The thin bottom line shows chapter position, not completion; its reference stays visible in writing mode.

Your place and bookmarks are stored in this browser, separately for each translation. They do not sync between devices; clearing browser storage removes them. Moving from the local prototype to the public URL does not transfer local saves. Focus and line guide are session controls. Offline support is available after a successful online load and service-worker installation. Browser support for fullscreen and screen wake lock varies.

WEB, BSB and ASV contain the 66-book Protestant canon. Douay-Rheims 1899 contains all 73 Catholic books, including the seven Deuterocanonical books and the longer Esther and Daniel texts. This traditional-language edition is public domain: https://ebible.org/engDRA/copyright.htm. Its original Psalm and verse numbering is preserved; the suggested shepherd psalm opens Psalm 22 rather than Psalm 23. Verse numbering can differ between translations; the app uses reference-based positions rather than assuming matching array offsets.

## Random verse

Select **Random verse** above the reader (hidden in writing mode), or open the passage chooser and select **Write a random verse**. This draws from the current translation, excluding the currently displayed starting verse. The one/two-verse preference still applies. Random exploration and its Next/Back navigation do not overwrite your saved sequential place. Use **Return to saved place** in the chooser, or reload to resume it. Bookmarks made while exploring are retained. Choosing a specific passage ends exploration and saves that new position.

## Visual book browser and personal imports

The chooser provides a Continue action, three starter passages, grouped visual books, and chapter buttons that open directly at the chapter’s first source verse. Browsing does not save a new position until a passage is selected. Specific verse selectors remain in a disclosure; reference search is still available. No copied-work percentage is inferred from navigation.

Settings → **Import your own Bible text** accepts the documented JSON shape (12 MB maximum), with an example download. PDFs/EPUBs are not supported. Imports are stored in browser IndexedDB, never uploaded or published. Chapter and verse identifiers must be ordered positive integers; book IDs must be unique three-character uppercase alphanumeric IDs. Text is rendered as text, not HTML. Each file has its own content-derived position namespace. The latest imported file appears in the translation chooser. Keep your original file: clearing site data removes imported text. Only import text you have permission to use.

## Phone layout

Desktop and tablet remain the primary experience. Phones use a full-width reader and bottom Back/Next controls, mirrored for the writing hand. The normal screen includes “Best on desktop or tablet. Works on phones, too.” The note and Random verse disappear in writing mode. Fullscreen has a full-viewport fallback where browser fullscreen is unavailable. Phone passage/settings panels fill the screen and reserve safe-area padding; opening the chooser does not autofocus the text input and summon the software keyboard.

Run `node scripts/phone_qa.mjs` for Chromium touch/viewport checks at phone portrait/landscape, tablet and desktop sizes. These are automated device-size simulations, not physical iPhone/Safari certification.

## Navigation polish

The reference control visibly says **Choose a passage** outside writing mode. The chooser groups translation and search, puts starting passages near the top, and reveals books earlier. Desktop Next has a quiet visible boundary; the dismissible keyboard hint sits above the reading sheet rather than covering the position label. This refinement does not change Scripture data or persistence formats. `node scripts/polish_qa.mjs` checks these UI requirements.

## Material finish

Controls use restrained tonal gradients and inset highlights. Book tiles have a tiny bundled SVG grain and muted binding colors by section. Scripture stays untextured. The four existing themes retain their backgrounds with richer matching accents. `node scripts/material_qa.mjs` checks palette text and filled-button gradient endpoint contrast; phone and geometry suites remain unchanged.

## Visual setting

The reader defaults to one verse, with an optional two-verse view in Settings. A or Left Arrow goes back; D, Space, or Right Arrow advances past the displayed verses. A dismissible keyboard hint and verse-count preference save locally. The reader uses one compact row: passage/translation chooser, writing mode, and settings. Duplicate selectors and surrounding verses are removed. Next has a large free-hand target with Back separated above it; writing-hand preference mirrors the controls. Line guide is in settings. The reader is a bounded writing sheet within original Christian chapel imagery. A cross belongs to the architecture rather than UI decoration. The passage picker and settings share the same visual system; dialogs trap keyboard focus and return it to Scripture on dismissal. Focus fades out the landscape without moving the text. Background choices use cool mineral tones; Night uses midnight blue. All motion respects reduced-motion settings. The image is bundled locally and cached for offline use.

## Current acceptance gate

Run `npm run qa:release` against the production preview. This runs 16 active suites, including typography/control contrast, onboarding, ordinary writing, phone layouts, private imports, random-return protection, persisted settings, native fullscreen and its fallback, stable Scripture geometry, reduced motion, and dialog focus. The fullscreen, persistence, and writing-acceptance selectors now match the chapel interface. Other older browser/release/layout scripts remain historical, not release gates.

## Typography and controls

Newsreader remains the Scripture and heading face. Source Sans 3 replaces Inter for controls and UI text; both are self-hosted. Headings use stronger weights, labels and helper text have clear roles, and primary actions use readable labels with a consistent control shape. Next retains its generous free-hand target. Scripture font size and its fixed writing anchor are unchanged. `scripts/typography_qa.mjs` checks font loading, toolbar non-overlap, option sizes, and Next contrast across all four themes. Source Sans 3's license is included in `public/fonts/source-sans-3-LICENSE.txt`.

## First visit and interaction details

New visitors get one skippable welcome: bring a notebook, choose a writing hand, and choose a passage or begin with Genesis. Changing hands moves the small desk preview and the real controls. Existing library or legacy saves bypass the welcome. Dismissal is stored separately under `scripture-scribe-introduction-v1`; Settings → **Show introduction** reopens it without resetting a passage or preference. No analytics or accounts are added.

Book chapters expand and collapse with a rotating disclosure marker. Panels have short entrances and faster, inert exits; changing panel type resets its scroll position so a scrolled welcome cannot obscure starter passages behind the chooser's sticky heading. Selection indicators connect the two handedness and verse-count options and the testament tabs. In writing mode the controls recede before the chapel fades, while Scripture retains its anchor. Ordinary verse advancement does not animate Scripture.

A brief **Saved** label appears at the bookmark only after browser storage succeeds. The existing persistent storage-error message remains authoritative if saving fails. Reduced motion removes spatial transitions; controls and labels still communicate every state.

Reference patterns: [Transitions.dev](https://transitions.dev/) panel reveal, accordion, and sliding selections; [ScreensDesign](https://screensdesign.com/) as the onboarding research reference. Gated screen recordings were not reviewed or copied. No third-party motion library or copied Pro code was added.

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
npm run qa:release
python3 scripts/data_qa.py
```

Browser tests use isolated headless Google Chrome instances. Current live-capable suites accept `QA_URL`; persistence QA intentionally exercises localhost migration data. Phone checks simulate viewport and touch behavior, not physical iPhone/Safari hardware.

## Public deployment

Source lives on `main`; compiled static assets are deployed to `gh-pages`. Publishing requires repository access and explicit approval.

```sh
DEPLOY_BASE=/scripture-writing/ npm run build
python3 scripts/deploy_pages.py
QA_URL=https://budhennekes.github.io/scripture-writing/ node scripts/onboarding_qa.mjs
QA_URL=https://budhennekes.github.io/scripture-writing/ node scripts/phone_qa.mjs
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
