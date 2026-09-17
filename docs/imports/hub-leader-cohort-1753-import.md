# Hub Leader Cohort — TutorLMS 1753 import review

Status: **DRY RUN ONLY — NOT IMPORTED**  
Prepared: 2026-09-16  
Import key: `tutorlms-1753-2026-09-16`

## Source summary

- Located source: `/Users/gilesemery/Desktop/1753 - Wayfinders Hub Leader Cohort.zip`
- Archive member: `1753 - Wayfinders Hub Leader Cohort/1753.json`
- Tutor export schema: `2.0.0`
- Tutor course: `1753` — **Wayfinders Hub Leader Cohort**
- Export timestamp: `September 9, 2026 10:54 am`
- Topics: **16** (`Pre-work`, then `Week 1`–`Week 15`)
- Child lesson/post records: **90**
- Source thumbnail candidate: `https://purposeos.socio-connect.com/wp-content/uploads/2025/05/hubleadercohort.png`
- The source thumbnail is reported only. The proposed import does not change the course cover.

The ZIP contains JSON only. Media is referenced by URL and is not bundled in the archive.

## Existing PurposeOS target

- Experience ID: `cfa2f5cb-1546-4041-af1b-00196d605610`
- Slug: `hub-leader-cohort`
- Name: **Hub Leader Cohort**
- Experience status: `draft`
- Visibility: `private`
- Current delivery mode: `custom_code` (empty legacy placeholder)
- Current Published Version pointer: **none**
- Versions: **0**
- Curriculum Weeks/Modules: **0**
- Cohorts: **0**
- Offerings: **0**
- Enrollments: **0**
- Existing theme/default theme: none
- Existing cover: none

The reviewed import will preserve the Experience ID and slug, change the empty placeholder from `custom_code` to shared `builder`, and create the first Draft Version. It will not create a second Experience.

## Dry-run result

| Proposed object | Count |
|---|---:|
| Weeks | 16 |
| Lessons | 18 |
| Pages | 67 |
| Blocks | 197 |
| Rich Text | 81 |
| Video | 12 |
| Image | 5 |
| PDF Reader | 32 |
| Document / File | 2 |
| External Link | 19 |
| Reflection | 42 |
| Short Response | 1 |
| Multi Select | 1 |
| Manual-rebuild Callout | 2 |
| Unique native media files | 35 |

Every one of the 90 Tutor child records is assigned to exactly one proposed PurposeOS Page. No source record is omitted or assigned twice.

## Proposed Course Navigator

```text
Pre-work
  Becoming a Practitioner
    Welcome & Orientation [2821]
    Welcome to the Journey [2815]
  Wayfinders Foundations
    Wayfinders Ethos Reflection [2822]
    Activate Your Purpose Diagram [2899]
    Activate Your Purpose Assessment [2867]
  Prepare to Lead
    Launching Your Wayfinders Hub [2902]
    Create Your Rule of Life [2903]
Week 1
  Personal Impact Statement
    Prepare & Overview [4671]
    Learn the Personal Impact Statement [2905, 1825]
    Facilitator Slide Deck [1827]
    Create Your Personal Impact Statement [1826, 4670]
    Practice With Someone Else [1828]
Week 2
  Shepherding & Influence
    Prepare & Overview [1841]
    The Posture of a Shepherd [1842, 1843, 1844, 1848, 1850]
    Circle of Influence [1851]
    Practice: Map Your Circle of Influence [1852, 4723]
Week 3
  Practicing Influence
    Prepare & Overview [1873]
    Experience the Circle of Influence [1874, 1877]
    Define Influence & Practice With Others [4759]
Week 4
  Boundaries, Bridges & Barriers
    Prepare & Overview [1940]
    John 4: Boundaries to Cross [1942]
    Bridges vs. Barriers [3187]
    Three Conversations About the Church [3186]
Week 5
  The Ecclesial Minimum
    Prepare & Reflect [1953, 4773]
    Worship, Community & Mission [1941, 1945]
    Evaluate Worship, Community & Mission [1955, 1957]
    Prepare for APEST & 5 Voices [3439]
Week 6
  APEST & 5 Voices
    Review & Prepare [3342, 2030]
    Name Your APEST & 5 Voices [3440, 3830]
    APEST in Action [3445, 3447, 3437]
    APEST Ministry Snapshot [3822]
Week 7
  Discovering Disciple-Making
    Reflect on Your APEST Conversation [4051]
    What Is Discipleship? [3339, 3407]
    Disciple-Making Discovery [4796]
    Prepare: How Do We Make Disciples? [3401]
Week 8
  Making Disciples
    How Do We Make Disciples? [4855, 3403]
    Disciple-Making Reflection [4817]
    Kaleo Disciple Training [3404]
Week 9
  Life Mapping U
    Prepare & Overview [5346]
    Complete Life Mapping U [4919]
    Name Your Top Five Transferable Skills [4050]
    Life Mapping U Slide Deck [4047]
Week 10
  Implementing Life Mapping U
    Learn From Others & Prepare [4151]
    Implementation Options [5376]
    Life Mapping U in Your Context [4150]
Week 11
  The Missionary Journey
    Prepare & Overview [2046]
    Start Anywhere Ministry [2047]
    A Roadmap to Multiplication [4231, 2049]
    Map Your Own Missionary Journey [2051]
    Build the Network Resource Library [2052, 4974]
Week 12
  Emotional Intelligence
    Prepare & Assess [4238, 4241]
    Emotional Intelligence & Spiritual Maturity [4239, 4242]
    Emotional Intelligence Tools [4245, 4246]
    Responding to Stories & Reflective Listening [4243, 4244]
Week 13
  Start Something
    Prepare & Overview [1973]
    Introduce Start Something [4261]
    Facilitate the Start Something Workshop [1974]
    Participant Booklet [4263]
    Digital Form [1978]
    Who Could Benefit? [1979]
Week 14
  Facilitating Effective Gatherings
    Prepare & Overview [4337]
    Facilitator Slide Deck [4407]
    The Art of Gathering [4361]
    Hub Leader Action Plan [4439]
Week 15
  Reflection & Commissioning
    Prepare & Overview [4476]
    Reflection & Affirmation [4477]
    Commissioning & a Journey Together [4478]
```

Bracketed numbers are internal Tutor source post IDs and are not participant-facing.

## Consolidation decisions

| Week | Decision |
|---|---|
| Pre-work | Seven Tutor fragments become three Lessons and seven Pages: orientation, Wayfinders foundations, and practical leadership preparation. |
| Week 1 | Overview, video, reminders, deck, worksheet/form, and field practice become one Personal Impact Statement Lesson with five sequential Pages. |
| Week 2 | Four short shepherding videos and the article are combined on one learner moment; the Circle of Influence deck and exercise remain distinct Pages. |
| Week 3 | Repeated Week 2 influence/deck assets are reused rather than uploaded again; the follow-up assignment becomes an Apply Page. |
| Week 4 | Overview, John 4 teaching, Bridges vs. Barriers, and three field conversations stay as four distinct formation moments. |
| Week 5 | The prior-week Bridges vs. Barriers follow-up joins preparation; the long Ecclesial Minimum content and PDF become one Learn Page; evaluation and assessment are combined. |
| Week 6 | APEST and 5 Voices results share one Page; the Alan Hirsch video, APEST visual, and slide deck form one Learn Page. The unknown Ministry Snapshot form remains separate for rebuild. |
| Week 7 | The APEST field conversation is followed by discipleship teaching, discovery, and Week 8 preparation rather than five LMS fragments. |
| Week 8 | Video and teaching combine; reflection and Kaleo resources remain separate. |
| Week 9 | Life Mapping U is presented as prepare, experience, capture skills, then facilitator deck. |
| Week 10 | Three records already form a coherent prepare/options/context sequence and remain three Pages. |
| Week 11 | Two Missionary Journey records combine into one roadmap Page and reuse their distinct source PDFs; network instructions and form combine. |
| Week 12 | Eight fragments become four Pages: assess, learn, tools, and reflective listening practice. |
| Week 13 | Start Something remains a six-step facilitator flow because the video, deck, booklet, digital form, and application each serve different uses. |
| Week 14 | Overview, facilitation deck, reading, and action plan remain four Pages. |
| Week 15 | Preparation, reflection/affirmation, and commissioning remain three Pages. |

## Content and HTML handling

- WordPress wrapper elements, classes, inline styling, iframes, scripts, and image-gallery markup are stripped.
- Headings, paragraphs, lists, emphasis, and HTTPS links are converted to the safe Markdown subset already rendered by PurposeOS Rich Text Blocks.
- Theological and formation language is retained rather than summarized or rewritten.
- Slide-image galleries are not imported when a source PDF represents the same deck.
- The article footnote markers `[25]`–`[28]` and Personal Impact Statement template tokens such as `[what]` are treated as curriculum text, not WordPress shortcodes.

## Media mapping

The dry run checked all **35** unique downloadable files:

- Available: **35**
- Eligible for native import under 25 MB: **35**
- Missing/unavailable: **0**
- Above 25 MB: **0**
- Largest checked file: `Personal-Impact-Statement-Workshop.pdf` — 21,132,956 bytes
- The repeated Weekly Assessment, Circle of Influence deck/exercise, and Community/Worship/Mission image resolve to one Resource each and are linked wherever reused.

Unique native media consists of 31 PDFs and 4 unique images. Those images produce 5 Image Block placements because one is reused. Source slide JPEG galleries are intentionally replaced by their PDF Reader counterpart where available.

### PDF Reader

PDFs intended for teaching, presentation, workbook use, or in-page reading become **PDF Reader** Blocks. Known facilitator/teaching decks use `slides` reader mode. Other PDFs use standard reader mode. The existing reader supplies open-in-new-tab and download actions from the same Resource.

### Document / File

Two items are primarily downloads rather than in-page teaching:

- Practitioner Pathway Notes Form Template (`1953`)
- Start Something participant booklet (`4263`)

These become **Document / File** Blocks.

### Images

Unique learner-facing images retained:

- Activate Your Purpose Diagram
- Shepherd field image
- Community / Worship / Mission image (reused in two Weeks)
- Start Anywhere / Activate Your Purpose map

Images that merely duplicate an attached PDF page or full slide gallery are omitted.

### Video

The 12 native Video Blocks remain external embeds; video is not downloaded into Storage:

- Welcome to the Journey
- Personal Impact Statement
- Dumb Sheep
- The Image of Shepherd
- Heart of a Shepherd
- Jesus the Good Shepherd
- Alan Hirsch on APEST
- Stop Saying Discipleship
- How Do We Make Disciples
- Spiritual and Emotional Maturity
- Reflective Listening
- Start Something introduction

All are YouTube URLs already supported by the shared PurposeOS video renderer.

## Forms and reflection mapping

### Rebuilt natively

The export contains enough question text to create **42 Reflection Blocks**, one Short Response, and one constrained Multi Select. Native conversion covers:

- Pre-work Ethos, Purpose Assessment, Hub Readiness, and Rule of Life reflections
- Week 1 field-practice questions
- Week 3 influence definition/practice questions
- Week 4 three-conversation reflection
- Week 5 Worship/Community/Mission reflection
- Week 6 top-two APEST selection and 5 Voices result
- Week 7 APEST conversation questions
- Week 8 disciple-making reflection
- Week 9 top-five transferable skills
- Week 13 Start Something application
- Week 15 reflection/application

Each response Block receives a linked `response_definitions` row so it remains editable and functional in the shared builder.

### Preserved external forms

Forms whose workflow, uploads, scoring, or hidden questions are not fully represented in the export remain External Link Blocks. This includes Formly/Getformly, Jotform, and Typeform activities such as the Personal Impact Statement upload, Circle of Influence form, assessments, Life Mapping U flow, network resource submission, Start Something digital form, and Hub Leader Action Plan.

Nineteen External Link Block placements are proposed. Repeated links are preserved where they are instructionally relevant.

### Needs native form rebuild

Two unresolved participant-facing markers are proposed:

1. Source `1953`: `[formidable id=6]` has no exported form definition and conflicts with the APEST use of Formidable form 6.
2. Source `3822`: `[formidable id=8]` contains no exported APEST Ministry Snapshot questions.

They become warning Callouts labelled **NEEDS NATIVE FORM REBUILD** in the Draft. Unsupported shortcode text itself is not copied into participant content.

Formidable items `3440`, `3830`, and `4050` can be reconstructed from their surrounding instructions and therefore become native response Blocks rather than unresolved shortcodes.

## Manual cleanup and review

- Rebuild the two unresolved Formidable activities after recovering their original questions.
- Review whether each preserved external form remains active and whether it should later be rebuilt natively.
- Review participant-facing wording after import, especially old references to “the form below,” “download,” or the previous LMS.
- Confirm whether the 2026 Personal Impact Statement workshop PDF is intentionally newer than the rest of the course export.
- Decide whether to adopt the source thumbnail as the PurposeOS cover. The importer deliberately leaves it unchanged.
- Preview large slide decks on desktop and mobile; the two largest are approximately 21 MB each but remain within the native limit.
- The source includes an LMU access code in instructional content. Confirm that it is still intended for cohort participants before publication.

## Provenance and rerun protection

- Modules, Lessons, Pages, Blocks, Resources, and response definitions use deterministic IDs derived from the import key and structural/source identity.
- Editable curriculum metadata records the import key, Tutor course ID, source topic/post IDs, original title, and source URL where applicable.
- Before any write, the utility queries target Module metadata for import key `tutorlms-1753-2026-09-16` or source course `1753`.
- If a matching import is present, it stops before mutation.
- It also stops rather than overwriting a non-empty Draft or touching a Published/Archived Version.
- Native Resources are deduplicated by deterministic source-URL ID.

## Exactly what the apply command will change

If target state still matches this dry run, the apply command will:

1. Change Experience `cfa2f5cb-1546-4041-af1b-00196d605610` from empty placeholder delivery mode `custom_code` to `builder`.
2. Create one Draft Version titled **Hub Leader Cohort**, labelled **TutorLMS 1753 import draft**.
3. Set Draft terminology to **Week**, with standard course shell and minimal header treatment.
4. Create 16 Weeks, 18 Lessons, 67 Pages, their single-column layouts, and 197 editable Blocks.
5. Create/link response definitions for the 44 native response Blocks.
6. Fetch the 35 eligible source files into private `purposeos-assets` Storage, create deduplicated Resource rows, and link them to Blocks.
7. Preserve external videos and forms as HTTPS configuration rather than copying video or faking form submission behavior.

It will **not** change `current_published_version_id`, publish anything, create or change enrollments, create or change offerings/cohorts, notify participants, replace the Experience, deploy, or push.

## Command for the next authorized step

Do not run this until the structure above is approved:

```bash
npm run import:hub-leader-cohort -- \
  --source='/Users/gilesemery/Desktop/1753 - Wayfinders Hub Leader Cohort.zip' \
  --confirm-source-course=1753 \
  --confirm-target=cfa2f5cb-1546-4041-af1b-00196d605610
```

The command rechecks the target and idempotency guard immediately before mutation. It creates only Draft builder content.

## Schema / SQL

No schema change is required. No SQL migration was created or applied.

## Dry-run command used

```bash
npm run import:hub-leader-cohort:dry-run -- \
  --source='/Users/gilesemery/Desktop/1753 - Wayfinders Hub Leader Cohort.zip' \
  --check-media \
  --json
```

This command performed read-only Supabase queries and read-only HTTP media checks. It made no database or Storage changes.
