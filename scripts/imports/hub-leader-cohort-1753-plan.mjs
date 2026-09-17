export const SOURCE_COURSE_ID = 1753;
export const TARGET_EXPERIENCE_ID = "cfa2f5cb-1546-4041-af1b-00196d605610";
export const TARGET_SLUG = "hub-leader-cohort";
export const IMPORT_KEY = "tutorlms-1753-2026-09-16";

const page = (key, title, sourceIds) => ({ key, title, sourceIds });
const lesson = (key, title, pages) => ({ key, title, pages });
const week = (key, title, sourceTopicId, lessons) => ({ key, title, sourceTopicId, lessons });

export const COURSE_PLAN = [
  week("pre-work", "Pre-work", 2810, [
    lesson("becoming-a-practitioner", "Becoming a Practitioner", [
      page("welcome", "Welcome & Orientation", [2821]),
      page("intro-video", "Welcome to the Journey", [2815]),
    ]),
    lesson("wayfinders-foundations", "Wayfinders Foundations", [
      page("ethos", "Wayfinders Ethos Reflection", [2822]),
      page("purpose-diagram", "Activate Your Purpose Diagram", [2899]),
      page("purpose-assessment", "Activate Your Purpose Assessment", [2867]),
    ]),
    lesson("prepare-to-lead", "Prepare to Lead", [
      page("hub-readiness", "Launching Your Wayfinders Hub", [2902]),
      page("rule-of-life", "Create Your Rule of Life", [2903]),
    ]),
  ]),
  week("week-1", "Week 1", 1823, [lesson("personal-impact-statement", "Personal Impact Statement", [
    page("prepare", "Prepare & Overview", [4671]),
    page("learn", "Learn the Personal Impact Statement", [2905, 1825]),
    page("facilitator-deck", "Facilitator Slide Deck", [1827]),
    page("create", "Create Your Personal Impact Statement", [1826, 4670]),
    page("practice", "Practice With Someone Else", [1828]),
  ])]),
  week("week-2", "Week 2", 1840, [lesson("shepherding-and-influence", "Shepherding & Influence", [
    page("prepare", "Prepare & Overview", [1841]),
    page("shepherding-posture", "The Posture of a Shepherd", [1842, 1843, 1844, 1848, 1850]),
    page("circle-of-influence", "Circle of Influence", [1851]),
    page("practice", "Practice: Map Your Circle of Influence", [1852, 4723]),
  ])]),
  week("week-3", "Week 3", 1872, [lesson("practicing-influence", "Practicing Influence", [
    page("prepare", "Prepare & Overview", [1873]),
    page("experience", "Experience the Circle of Influence", [1874, 1877]),
    page("apply", "Define Influence & Practice With Others", [4759]),
  ])]),
  week("week-4", "Week 4", 1938, [lesson("boundaries-bridges-and-barriers", "Boundaries, Bridges & Barriers", [
    page("prepare", "Prepare & Overview", [1940]),
    page("john-4", "John 4: Boundaries to Cross", [1942]),
    page("bridges-vs-barriers", "Bridges vs. Barriers", [3187]),
    page("conversations", "Three Conversations About the Church", [3186]),
  ])]),
  week("week-5", "Week 5", 1951, [lesson("ecclesial-minimum", "The Ecclesial Minimum", [
    page("prepare", "Prepare & Reflect", [1953, 4773]),
    page("learn", "Worship, Community & Mission", [1941, 1945]),
    page("evaluate", "Evaluate Worship, Community & Mission", [1955, 1957]),
    page("next-week", "Prepare for APEST & 5 Voices", [3439]),
  ])]),
  week("week-6", "Week 6", 2029, [lesson("apest-and-five-voices", "APEST & 5 Voices", [
    page("prepare", "Review & Prepare", [3342, 2030]),
    page("results", "Name Your APEST & 5 Voices", [3440, 3830]),
    page("learn", "APEST in Action", [3445, 3447, 3437]),
    page("snapshot", "APEST Ministry Snapshot", [3822]),
  ])]),
  week("week-7", "Week 7", 3336, [lesson("discovering-disciple-making", "Discovering Disciple-Making", [
    page("apest-conversation", "Reflect on Your APEST Conversation", [4051]),
    page("discipleship", "What Is Discipleship?", [3339, 3407]),
    page("discovery", "Disciple-Making Discovery", [4796]),
    page("prepare", "Prepare: How Do We Make Disciples?", [3401]),
  ])]),
  week("week-8", "Week 8", 3400, [lesson("making-disciples", "Making Disciples", [
    page("learn", "How Do We Make Disciples?", [4855, 3403]),
    page("reflect", "Disciple-Making Reflection", [4817]),
    page("kaleo", "Kaleo Disciple Training", [3404]),
  ])]),
  week("week-9", "Week 9", 4045, [lesson("life-mapping-u", "Life Mapping U", [
    page("prepare", "Prepare & Overview", [5346]),
    page("experience", "Complete Life Mapping U", [4919]),
    page("skills", "Name Your Top Five Transferable Skills", [4050]),
    page("facilitator-deck", "Life Mapping U Slide Deck", [4047]),
  ])]),
  week("week-10", "Week 10", 4148, [lesson("implementing-life-mapping-u", "Implementing Life Mapping U", [
    page("prepare", "Learn From Others & Prepare", [4151]),
    page("options", "Implementation Options", [5376]),
    page("context", "Life Mapping U in Your Context", [4150]),
  ])]),
  week("week-11", "Week 11", 2045, [lesson("missionary-journey", "The Missionary Journey", [
    page("prepare", "Prepare & Overview", [2046]),
    page("start-anywhere", "Start Anywhere Ministry", [2047]),
    page("roadmap", "A Roadmap to Multiplication", [4231, 2049]),
    page("your-journey", "Map Your Own Missionary Journey", [2051]),
    page("network", "Build the Network Resource Library", [2052, 4974]),
  ])]),
  week("week-12", "Week 12", 2109, [lesson("emotional-intelligence", "Emotional Intelligence", [
    page("prepare", "Prepare & Assess", [4238, 4241]),
    page("learn", "Emotional Intelligence & Spiritual Maturity", [4239, 4242]),
    page("tools", "Emotional Intelligence Tools", [4245, 4246]),
    page("listening", "Responding to Stories & Reflective Listening", [4243, 4244]),
  ])]),
  week("week-13", "Week 13", 1970, [lesson("start-something", "Start Something", [
    page("prepare", "Prepare & Overview", [1973]),
    page("introduction", "Introduce Start Something", [4261]),
    page("facilitate", "Facilitate the Start Something Workshop", [1974]),
    page("booklet", "Participant Booklet", [4263]),
    page("digital", "Digital Form", [1978]),
    page("lead", "Who Could Benefit?", [1979]),
  ])]),
  week("week-14", "Week 14", 2811, [lesson("facilitating-gatherings", "Facilitating Effective Gatherings", [
    page("prepare", "Prepare & Overview", [4337]),
    page("facilitator-deck", "Facilitator Slide Deck", [4407]),
    page("art-of-gathering", "The Art of Gathering", [4361]),
    page("action-plan", "Hub Leader Action Plan", [4439]),
  ])]),
  week("week-15", "Week 15", 2812, [lesson("reflection-and-commissioning", "Reflection & Commissioning", [
    page("prepare", "Prepare & Overview", [4476]),
    page("reflect", "Reflection & Affirmation", [4477]),
    page("commissioning", "Commissioning & a Journey Together", [4478]),
  ])]),
];

export const NATIVE_RESPONSES = {
  2822: [
    "Which Wayfinder principle comes naturally to you?",
    "Which principle challenges your current mindset or habits—and why?",
    "What would change if your lowest-scored area became a strength?",
    "What principle do you want to embody more intentionally in this next season?",
  ],
  2867: [
    "Which area—Disciple, Leader, or Impact—do you feel most confident in?",
    "Which stage are you currently in? Did any score surprise you?",
    "Where is God inviting you to grow?",
    "What specific step could you take this week to lean into that growth?",
  ],
  2902: [
    "Which statement did you rate highest—and why?",
    "What area of readiness feels like your biggest opportunity for growth?",
    "What mindset, tool, or habit would you multiply in the next six months, and who would you invest in first?",
  ],
  2903: [
    "What rhythms in your current life feel life-giving, and which feel draining?",
    "What new practices do you sense the Spirit inviting you into?",
    "Which area of your Rule of Life needs the most attention?",
    "How can this Rule support your growth as a disciple and leader over the next 15 weeks?",
  ],
  1828: [
    "Who did you guide through the Personal Impact Statement process? If you have not yet, when do you plan to?",
    "How did it go? What was encouraging and what was challenging?",
    "Where do you see yourself using this next?",
    "When will you use this tool again?",
    "Who might you invite to learn how to facilitate it with you?",
  ],
  4759: [
    "How would you define your circle or sphere of influence?",
    "Who has specifically influenced you, and how or why?",
    "What did the person you interviewed say about positive influence?",
    "How did they know they had influence in someone’s life?",
  ],
  3186: [
    "What stood out or surprised you in your three conversations?",
    "Where did you sense connection or resistance?",
    "How might these views of the Church reveal a barrier or a bridge?",
  ],
  1955: [
    "Which comes more easily for you: worship, community, or mission?",
    "Which is most prominent in your ministry, and why?",
    "What pitfall do you want to be aware of?",
  ],
  4051: [
    "How did the conversation go as you talked with someone about their APEST results?",
    "What did you notice as the person engaged their APEST calling?",
    "What did you share from the previous Hub Leader call, and how did it shape the discussion?",
    "What did this experience teach you about engaging people after assessments?",
  ],
  4817: [
    "Who may God be inviting you to pray for and invite into a disciple-making relationship?",
    "Where are you grounded in spiritual practices, and where do you need greater intentionality?",
    "What practices or simple methods could cultivate a disciple-making movement in your context?",
  ],
  1979: [
    "What idea or project do you personally desire to run through the Start Something Framework?",
    "Who in your context could benefit from using this tool to turn an idea into reality?",
  ],
  4477: [
    "What was a memorable experience from your time at the retreat?",
    "What is something specific you plan to start, change, or reimagine in your context?",
  ],
};

export const NATIVE_SPECIAL_RESPONSES = {
  3440: { type: "checklist", prompt: "Select your top two APEST types.", options: ["Apostle", "Prophet", "Evangelist", "Shepherd", "Teacher"], minSelections: 2, maxSelections: 2 },
  3830: { type: "structured_response", prompt: "What are your 5 Voices results?" },
  4050: { type: "reflection", prompt: "What are your top five transferable skills?" },
};

export const UNRESOLVED_SHORTCODES = {
  1953: "[formidable id=6] appears without its form definition and conflicts with another use of Formidable form 6.",
  3822: "[formidable id=8] does not include the APEST Ministry Snapshot questions in the export.",
};

export const EXTERNAL_FORM_HOSTS = ["getformly.app", "getformly.com", "form.jotform.com", "form.typeform.com"];

// Inline image galleries that duplicate a PDF/slide resource are deliberately
// omitted. These are the few images that add unique learner-facing content.
export const KEEP_INLINE_IMAGE_SOURCE_IDS = new Set([1843, 1955, 3342, 2047]);

export const DOCUMENT_SOURCE_IDS = new Set([1953, 4263]);
export const SLIDE_SOURCE_IDS = new Set([1827, 1851, 1874, 1945, 3437, 4047, 4239, 1974, 4407]);
