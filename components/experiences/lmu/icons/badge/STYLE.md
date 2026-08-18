# Primary LMU Wayfinding Badge System

## Badge geometry

- Source geometry: exactly follows `public/brand/lmu/lmu-u-mark.png` on its
  native `2000 × 1900` canvas.
- Silhouette coordinates: `(55,24) → (1945,24) → (1945,1630) →
  (1000,1876) → (55,1630)`.
- Form: a full flat top, straight vertical sides through roughly 86% of the
  height, then two shallow lower edges meeting at the centered point.
- Proportion: width-to-height ratio is `2000:1900` (`1.0526316:1`). Do not
  force the badge into a square or alter this ratio.
- Character: a wayfinding/personal marker—not a military shield or decorative crest.
- Rendering: flat color only. No gloss, gradient, texture, or shadow inside the badge.
- Outline: 1.25 CSS pixels at the 48px reference height, scaling visually with
  the badge while the source silhouette remains unchanged.

## Symbol safe area

- Symbols use a nested `24 × 24` grid within the badge.
- The standard rendered symbol is approximately 25 × 25px inside a 48px badge.
- Keep important geometry between 2 and 22 on the symbol grid.
- Optically center against the badge body, approximately 1px above mathematical
  center to compensate for the lower point.
- Use one dominant metaphor with no more than three primary shapes.

## Symbol construction

- Default stroke: 1.65 on the 24-unit grid.
- Line caps: square. Line joins: bevel.
- Minimum visible stroke is the standard stroke; do not introduce hairlines.
- Fills are avoided except for the badge field itself.
- Symbols must remain recognizable at a 40px badge before approval.
- New symbols should be simplified and custom-fit rather than imported unchanged
  from a general-purpose icon library.

## Current symbol metaphors

- Success Stories: open book.
- Realistic: one distinct, immediately recognizable mechanical cog.
- Social: paired conversation bubbles.
- Conventional: organized checklist.
- Artistic: clearly separated paint palette and brush.
- Enterprising: lightbulb for ideas, initiative, and momentum.
- Investigative: magnifying glass containing a question mark.

## States

- `light`: deliberate pale-neutral badge, charcoal symbol, muted warm border.
- `active`: LMU orange badge and border, cream symbol.
- `dark`: charcoal badge and border, cream symbol.
- `outlined`: cream/transparent field, charcoal outline and symbol.
- State meaning must also be communicated by surrounding text or structure; color
  is never the sole carrier of meaning.

## Size variants

- 40px: minimum product size; simplify a new symbol if it breaks down here.
- 48px: standard card and list badge.
- 64px: category header and result-summary badge.
- 80–96px: presentation or feature use; do not add detail at larger sizes.

## Adding future symbols

Add the semantic name to the typed icon registry, implement it once in
`LMUBadgeSymbol`, and validate it in all four states at 40px and 48px. Preserve
the same safe area, stroke, centering, visual weight, and metaphor-first approach.
Future candidates include Values, Growth, Location, Salary, Motivators, Life Map,
Conversation, Resources, Goals, Training, Assessment, and Reflection.
