# Focused handwriting design acceptance

## Product constraint

A copying companion, not a study dashboard. Optimize for looking up from a physical notebook, finding the line, writing, and advancing with the free hand. Scripture is primary. Avoid loud framing, enormous chapter titles, decorative cards, streaks, and idle animation.

## Approved refinements

1. An obvious **Enter writing mode** action and always reachable **Exit writing mode**. Briefly fade secondary UI without moving the Scripture when entering or exiting.
2. A small ribbon-like bookmark settling motion on save. No toast over Scripture; plain save errors. No success animation on failed storage writes.
3. A restrained line mark in the margin. It only moves on user input, follows real line height, and never alters the source text.
4. Brief tactile feedback on navigation controls when arrow keys advance/back. Scripture must not slide or animate while the user copies it.

Reduce oversized book/chapter typography. Retain comfortable readable serif Scripture, restrained controls, adjustable type, and light/dark support. Do not substitute a new loud palette for functional polish.

## Interaction requirements

- Keep the active text anchored when entering writing mode and advancing ordinary verses.
- Space/right advance and left returns. Arrows continue working after toolbar actions.
- Preserve native keyboard behavior in inputs, selects, and open dialogs. A keyboard-focused line guide uses up/down for lines without also moving verses.
- Ignore modifier shortcuts and repeated keydowns for verse navigation.
- Pointer-clicking a writing control must not leave Space unexpectedly toggling that control.
- Honor reduced motion; no drifting Scripture or idle effects.
- Preserve all three translations, local positions/bookmarks, and migration behavior.
- Long verses remain scrollable at the selected font size, including 52px on narrow screens.
- Local storage is not cloud backup, and current verse is not a handwriting-completion claim.

## Release checks

Run production build, existing behavior/migration/readability tests, and `scripts/writing_acceptance.mjs`. Visually review normal/reduced-motion desktop and mobile writing mode. After publishing, run release and writing-acceptance tests against the actual public HTTPS URL.
