export interface LMUValueDefinition { id: string; originalLabel: string; displayLabel: string; briefDescription?: string }
const displayLabelOverrides: Record<string, string> = {
  "Your faith": "Faith", "Beauty/art": "Beauty and Art", "Health/wellness": "Health and Wellness",
  "Concern for environment": "Environmental Stewardship", "Self-development": "Personal Growth",
  "Knowledge as insight": "Insight and Understanding", "Self-assertion": "Assertiveness",
  "Profit-making": "Profit / Financial Return", "Equilibrium": "Balance", "Socially conscious": "Social Responsibility",
  "Being one’s self": "Authenticity", "Education as certification": "Formal Education / Credentials",
  "Working conditions": "Healthy Working Conditions",
};
const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const originals = [
  "Creativity", "Independence", "Your faith", "Nurturing others", "Beauty/art", "Health/wellness", "Social affirmation", "Competence", "Concern for environment", "Equal rights", "Truth", "Self-control", "Patriotism", "Justice", "Self-development", "Solitude", "Achievement", "Variety", "Friendship", "Prestige", "Knowledge as insight", "Charity", "Loyalty", "Simplicity", "World peace", "Self-assertion", "Openness", "Work/labor", "Harmony", "Advancement", "Power", "Interdependence", "Security", "Love", "Self-respect", "Wholeness", "Adventure", "Children", "Integrity", "Community", "Law", "Feminism", "Profit-making", "Political activism", "Survival", "Expertise", "Autonomy", "Affection", "Equilibrium", "Service to others", "Protect the vulnerable", "Diversity", "Socially conscious", "Relationships", "Wealth", "Tolerance", "Respect", "Freedom", "Being one’s self", "Progress", "Contemplation", "Support", "Education as certification", "Duty", "Courage", "Cooperation", "Play", "Curiosity", "Recognition", "Working conditions", "Human dignity", "Family",
] as const;
export const lmuValues: LMUValueDefinition[] = originals.map((originalLabel) => ({ id: slug(originalLabel), originalLabel, displayLabel: displayLabelOverrides[originalLabel] ?? originalLabel }));
export const lmuValueById = new Map(lmuValues.map((value) => [value.id, value]));
