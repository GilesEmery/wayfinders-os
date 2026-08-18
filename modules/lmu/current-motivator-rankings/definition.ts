import type { LMUModuleDefinition } from "@/lib/experiences/lmu/types";

export const currentMotivatorRankingsDefinition: LMUModuleDefinition = {
  id: "current-motivator-rankings", slug: "current-motivator-rankings",
  title: "Current Motivator Rankings", shortTitle: "Motivators",
  description: "Rank the factors that matter most in your current season and next decisions.",
  estimatedMinutes: 20, version: "1.0.0", status: "active", requiredModules: ["transferable-skills","location","teammates","supervisor","growth","values","x-factor","salary"],
  stages: [{id:"introduction",title:"Introduction"},{id:"review",title:"Motivator Review"},{id:"ranking",title:"Build Priority Order"},{id:"final-review",title:"Final 1–8 Review"},{id:"final",title:"Confirmed Ranking"}],
  allowedExperiences: ["life-mapping-u-original"],
};
