# CODEX 3 — working course-builder prototype

**Ready for owner review. No live integration, push or deployment.**

Open **[the interactive demo](http://localhost:32013/dev/course-builder-prototype)**. The isolated local server is running. This is fictional four-week material, not the existing Hub Leader Course.

If the server needs restarting, run this from the VS Code terminal at the repository root:

```sh
node scripts/prototypes/open-demo.mjs
```

Stop that launcher with Ctrl+C. It creates a temporary Next app using the same repository components/model, without the platform AuthProvider, proxy, environment credentials or service connections. It preserves any existing development server. Cached local fonts are reused; system fonts are the fallback. No package installation or account login is needed. Local port can be changed with `CODEX3_PORT=32016 node scripts/prototypes/open-demo.mjs`.

## Try the workflow

1. Open a chapter in the left curriculum. Select **Explore the idea** or **Practice together**. Rename a lesson by editing its title; use the arrows, Copy, Duplicate chapter, Add lesson and Add chapter controls.
2. Select **Edit** on a text card. Use H1–H6 / Body / Small in the style dropdown, then independent Bold / Italic / Underline, links and lists. Uncheck **Use as a semantic heading** to keep a heading-sized paragraph without heading semantics.
3. Open **Font…** for explicit size, family and color overrides. **Reset to course style** removes only those font overrides; it does not clear bold, italic, underline or text content.
4. Open **Course Customization**. Change the H4 desktop size, mobile size, line height or font. Standard H4 examples update together across blocks; explicit 21px examples remain 21px. Try the three font themes. Toggle Companion here.
5. Open **Learner preview** and **Mobile preview**. The learner layout is Navigator → Content → Companion when enabled; it stacks on a narrow screen. Week 4 has a two-column hybrid example and an interactive community map.
6. Try a reflection, notes or chat in preview using fictional text. These preview entries stay in memory and are not included in the course export. Download placeholders generate local demo text files, not real course resources.
7. **Add content** includes ordinary content and the existing registry’s advanced categories. **Edit** exposes exact configuration/settings/metadata/renderer keys. Unsupported content is kept as data with a visible fallback; it is never flattened or executed as arbitrary code.
8. **Course Settings** contains the release boundary and a **32-week outline** stress demo. Production publishing is disabled. **Reset** restores the fictional four weeks; **Export demo** keeps a JSON review copy.

## Saving

Edits autosave to this browser’s dedicated `purposeos:codex3:fictional-course:v1` storage key. Status distinguishes in-memory, editing, saving locally, saved locally, failed save and cross-tab conflict. A brief local receipt delay makes the saving state visible; it is not a server latency measurement. Save failures retain the draft; another tab’s changes require an explicit recovery choice. The exported JSON is a prototype review artifact, **not a production import or migration**.

## Verification and review

11 focused offline tests, 20 real Chrome interaction checks, TypeScript, prototype lint and the network-guarded production webpack build passed. Browser checks recorded zero external requests, zero runtime exceptions and zero console errors. The production build returns **404** for this development-only route; the isolated local demo returns **200**.

[Review details, token table, compatibility gaps and file list](REVIEW-AND-VERIFICATION.md).

Please review the authoring flow, heading scale, font themes, advanced controls and desktop/mobile Companion presentation. **Approval of this prototype’s design is the next gate.** Live builder integration, publishing/runtime serialization and validation against the actual current Hub Leader Course require a separate approved phase.

**External Actions Required:** none for local review. No Supabase or Vercel action is needed. A remote Preview or live integration requires separate explicit authorization.

### Drag ordering and text controls

Drag the ⠿ handle onto the destination chapter, lesson row, or content header to place it before that item. Lessons stay in their chapter; blocks stay in their existing column so hybrid layouts remain intact. Up/down buttons remain available for keyboard and touch use.

Use the **Edit** button to the right of a chapter or lesson heading to open the common text toolbar and **Font…** for explicit size/family/color overrides. Section headings are available under **Advanced layout, pages & preserved source**. Content **Edit** provides matching controls for text, media titles/captions, reflection prompts and other ordinary string fields. Image alt text remains a plain accessibility description. Raw code, URLs and structured settings remain in **Edit**.

All 17 content categories remain available. Unsupported live/custom integrations retain their configuration and preview placeholders; this remains a local prototype, not a replacement published renderer.

### Advanced side panels and Section 5 showcase

Refresh the running demo and open **Section 5 · Advanced features showcase** in the curriculum. Its 17 lessons demonstrate every available content category with subtitles, supporting text boxes, captions, and layout options already applied. Existing local edits are retained; the showcase is appended when absent. A reset restores the four-week course plus this fifth chapter.

**Edit** now opens a right-side panel. Use named text controls, **Additional text**, **Layout & appearance**, media/resource settings, response items, or visibility/completion draft controls. **Source** retains exact configuration, settings, metadata and custom renderer source. Ordinary changes update immediately; raw source requires **Apply to local demo**. Close with **Done**, ×, or Escape. On mobile it opens as a drawer.

For a chapter or lesson, choose the right-side **Edit** button. Their title editor, additional text, layout and requirement controls stay local. **Font…** opens a side panel too: select text first, then adjust its size to see the change immediately without leaving the number field.

Video/source/poster URLs and transcript settings are editable configuration; the isolated demo never fetches remote media. PDF, assessment and arbitrary system integrations retain placeholders. Checklist/check-in/card selection and structured-response examples provide memory-only sample interactions, not live submissions. This is still an owner-review prototype.

Heading and text lines now use the same content card, header bar, and right-side **Edit** button as ordinary content boxes. Chapters, lessons and section headings retain their existing identities and sidebar settings.

### Full current course review

A separate current published Hub Leader copy is available at **http://localhost:32016/dev/hub-leader-builder**. See [its review instructions](hub-leader-review/README.md). It preserves the 16 chapters, 68 pages and 194 authoring blocks and keeps its local saves separate from this fictional demo.
