# Reference Icon Exploration — Constructed

Set B is retained as a reference exploration. The canonical product treatment is
now the LMU Wayfinding Badge system in `../badge/STYLE.md`.

## Drawing specification

- **SVG grid:** Every icon uses `viewBox="0 0 24 24"`. Build on a strong
  orthogonal 2-unit module, using the 12-unit axes for optical centering.
- **Stroke:** `1.5` units throughout. Do not vary stroke weight within an icon
  or between icons.
- **Line caps:** `square`.
- **Line joins:** `bevel`.
- **Fill:** Default is `none`. A small solid registration point may be used only
  when a stroke cannot remain legible at badge size; never use broad filled
  illustration areas.
- **Padding:** Keep a minimum optical inset of 3 units from the 24-unit bounds.
  A single functional terminal may approach 2 units only when needed to balance
  the mark at 24px.
- **Corners:** Use architectural, constructed corners. Prefer bevels, square
  frames, and deliberate intersections over soft or decorative curves. Circles
  are allowed when essential to the metaphor, such as gears or a lens.
- **Construction:** Assemble symbols from a small number of frames, modules,
  joined tools, and directional parts. Align related elements to common axes.
- **Complexity:** Use no more than three primary shapes or approximately five
  meaningful internal details. Remove any line that is not needed for immediate
  recognition at the existing 48px badge size.

## Color and badge behavior

- Icons inherit `currentColor`; SVG files/components contain no brand colors.
- Default icons and badge borders use LMU charcoal.
- Selected/active icons and badge borders use LMU orange.
- Color is supportive. Selection must also retain its border, text, or structural
  state so meaning never depends on color alone.
- The badge dimensions, padding, corner tick, and icon scale remain consistent
  across every icon.

## Canonical symbols

- Success Stories: constructed open book.
- Realistic: one large and one small interlocking mechanical gear.
- Social: two connected conversation bubbles.
- Conventional: organized clipboard with ordered checks.
- Artistic: paint palette and brush.
- Enterprising: podium with microphone, representing public initiative and influence.
- Investigative: magnifying glass paired with a restrained detective hat.

## Extending the system

Every future LMU icon must:

1. Begin on the same 24 × 24 grid.
2. Use the same 1.5-unit square-cap, bevel-join stroke system.
3. Use no more detail than the metaphor requires.
4. Remain clear at the existing badge size before being approved.
5. Communicate through a concise metaphor, not an illustration.
6. Avoid emoji, cartoon, clip-art, or generic application-UI language.

Future additions may cover Values, Growth, Location, Salary, Motivators, Life
Map, Resources, Training, Assessment, Reflection, Conversation, Goals, and other
Wayfinders/LMU concepts. Add new names to the typed registry and implement the
same name in the primary family renderer; do not scatter SVG markup through UI
components.
