import type { TransferableSkillCategory, TransferableSkillCategoryId } from "./types";
import { remainingSkillHelp } from "./skill-help";

const canonicalOverrides: Record<string, string> = {
  "problem solving": "problem-solving",
  "solving problems": "problem-solving",
  "showing good judgment": "showing-good-judment",
};

const legacyIdOverrides: Record<string, string> = {
  "showing good judgment": "showing-good-judment",
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const realisticSkillHelp: Record<string, { briefDescription: string; longDescription: string }> = {
  "Measuring": { briefDescription: "Using dimensions, amounts, distance, time, or other quantities accurately.", longDescription: "Measuring includes determining size, distance, weight, volume, time, or other quantities in order to complete a task accurately or make a practical decision." },
  "Sewing or styling": { briefDescription: "Working hands-on with materials, clothing, appearance, or presentation.", longDescription: "This may include sewing, altering, arranging, styling, grooming, or working directly with materials to improve how something fits, functions, or looks." },
  "Servicing things": { briefDescription: "Maintaining equipment, objects, or systems so they continue to work well.", longDescription: "Servicing things includes routine maintenance, cleaning, adjusting, inspecting, or caring for equipment and objects to keep them operating properly." },
  "Troubleshooting": { briefDescription: "Finding the cause of a practical problem and figuring out how to correct it.", longDescription: "Troubleshooting involves noticing that something is not working as expected, identifying possible causes, testing solutions, and working toward a practical fix." },
  "Assembling": { briefDescription: "Putting parts or pieces together to create a finished result.", longDescription: "Assembling means following a process or understanding how components fit together so that separate pieces become a functional whole." },
  "Using machines": { briefDescription: "Operating tools or machines effectively to accomplish a task.", longDescription: "This includes learning how equipment works, using it safely and effectively, and adjusting your actions based on what the machine or tool requires." },
  "Cooking": { briefDescription: "Preparing food through practical skill, timing, and hands-on processes.", longDescription: "Cooking may involve following or adapting recipes, coordinating ingredients and timing, using kitchen tools, and creating food that serves a desired purpose." },
  "Repairing": { briefDescription: "Restoring something damaged or broken so it works again.", longDescription: "Repairing means identifying what is damaged, understanding how it should function, and using practical skills to restore or improve it." },
  "Building": { briefDescription: "Creating something tangible from materials, parts, or plans.", longDescription: "Building involves turning an idea, plan, or set of materials into a physical result through hands-on work, sequencing, and practical problem solving." },
  "Operating Equipment": { briefDescription: "Using specialized equipment safely and effectively.", longDescription: "This may include vehicles, power tools, machinery, technical equipment, or other specialized tools that require practical knowledge and control." },
  "Using one’s hands": { briefDescription: "Applying physical coordination and hands-on skill to complete a task.", longDescription: "This includes manual dexterity, manipulating objects, working with materials, or using your hands precisely and effectively to produce a result." },
  "Fixing things": { briefDescription: "Making practical corrections when something is not working properly.", longDescription: "Fixing things may involve adjusting, repairing, replacing, reconnecting, or improving something so that it works the way it should." },
  "Lifting/ pushing": { briefDescription: "Using physical strength and effort to move or position things.", longDescription: "This includes tasks where strength, endurance, body awareness, or physical effort is an important part of getting the work done." },
  "Installing": { briefDescription: "Putting equipment, materials, or systems into place so they function properly.", longDescription: "Installing involves understanding where and how something belongs, preparing the space, fitting or connecting components, and making sure the finished installation works correctly." },
  "Development": { briefDescription: "Taking something practical from an early idea or condition toward a more complete or useful form.", longDescription: "In the Realistic category, Development refers to hands-on improvement or creation: shaping, constructing, refining, or advancing something tangible so it becomes more functional, complete, or effective. This is not intended here primarily as software development unless the participant’s actual story involved hands-on technical creation that fits the Realistic category." },
};

function skills(categoryId: TransferableSkillCategoryId, labels: string[]) {
  return labels.map((label) => {
    const normalized = legacyIdOverrides[label.toLowerCase()] ?? slugify(label);
    return { id: `${categoryId}-${normalized}`, label, categoryId, canonicalKey: canonicalOverrides[label.toLowerCase()] ?? normalized, ...(categoryId === "realistic" ? realisticSkillHelp[label] : remainingSkillHelp[categoryId]?.[label]) };
  });
}

export const transferableSkillCategories: TransferableSkillCategory[] = [
  {
    id: "realistic", slug: "realistic", title: "Realistic", subtitle: "Working With Things", iconKey: "realistic",
    description: "Physical work, manual skills, outdoors, sports skills, often tangible results, working with your hands",
    skills: skills("realistic", ["Measuring", "Sewing or styling", "Servicing things", "Troubleshooting", "Assembling", "Using machines", "Cooking", "Repairing", "Building", "Operating Equipment", "Using one’s hands", "Fixing things", "Lifting/ pushing", "Installing", "Development"]),
  },
  {
    id: "social", slug: "social", title: "Social", subtitle: "People", iconKey: "social",
    description: "Interpersonal, communicative, writing, speaking, teaching, guiding, helping",
    skills: skills("social", ["Explaining concepts", "Giving advice that’s valued", "Talking", "Making friends", "Communicating warmth", "Writing", "Helping with personal problems", "Training", "Being of service to others", "Showing sensitivity", "Listening well", "Facilitating team work", "Showing patience", "Leading groups", "Teaching", "Understanding people", "Coordinating needed actions", "Caring for people"]),
  },
  {
    id: "conventional", slug: "conventional", title: "Conventional", subtitle: "Working With Things + Data", iconKey: "conventional",
    description: "Detail work, following through, numerical skills, information",
    skills: skills("conventional", ["Controlling inventory", "Using Excel spreadsheets", "Things are in on time", "Speeding things up", "Being a resource expert", "Tracking details", "Organizing data", "Checking things", "Using numbers", "Remembering things", "Knowing rules, procedures", "Reasoning with numbers", "Estimating", "Analyzing cost", "Bookkeeping", "Using math"]),
  },
  {
    id: "artistic", slug: "artistic", title: "Artistic", subtitle: "People + Ideas", iconKey: "artistic",
    description: "Creativity, intuition, innovation",
    skills: skills("artistic", ["Generating new ideas", "Adapting", "Experimenting", "Showing a sense of humor", "Shaping things", "Designing things", "Developing things", "Showing good judgment", "Being practical", "Creating things", "Starting things", "Graphic design", "Improving", "Decorating", "Creating poetry, music, art", "Drawing, building models"]),
  },
  {
    id: "enterprising", slug: "enterprising", title: "Enterprising", subtitle: "People + Data", iconKey: "enterprising",
    description: "Organizational, persuading, performing, leading, planning",
    skills: skills("enterprising", ["Developing trust", "Persuading", "Motivating others", "Recruiting", "Selling ideas/ products", "Negotiating", "Organizing teamwork", "Speaking in front of groups", "Planning", "Making people laugh", "Lead event/ project", "Initiating (starting)", "Organizing time well", "Working without supervision", "Changing, improving things", "Coaching", "Solving problems", "Leading others"]),
  },
  {
    id: "investigative", slug: "investigative", title: "Investigative", subtitle: "Ideas + Data", iconKey: "investigative",
    description: "Analytical, researching, systematizing, evaluating",
    skills: skills("investigative", ["Getting information", "Analyzing", "Problem solving", "Diagnosing", "Critiquing", "Researching", "Displaying common sense", "Recognizing skills of others", "Spotting important things", "Organizing data", "Evaluating", "Comparing things", "Sizing up situations", "Estimating"]),
  },
];

export const transferableSkillsByCanonicalKey = new Map(transferableSkillCategories.flatMap((category) => category.skills).map((skill) => [skill.canonicalKey, skill]));
