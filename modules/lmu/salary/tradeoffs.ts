import type { ParticipantModuleProgress } from "@/lib/experiences/lmu/types";
import type { LocationResponse } from "@/modules/lmu/location/types";
import type { SalaryResponse, SalaryTradeoffDomain, SalaryTradeoffScenario } from "./types";

interface DomainContext { domain: SalaryTradeoffDomain; label: string; values: string[]; sourceCompletedAt?: string }

const domainOrder: SalaryTradeoffDomain[] = ["skills", "growth", "location", "values", "x-factor", "teammates", "supervisor"];
const sourceIds: Record<SalaryTradeoffDomain, string> = { skills: "transferable-skills", growth: "growth", location: "location", values: "values", "x-factor": "x-factor", teammates: "teammates", supervisor: "supervisor" };
const labels: Record<SalaryTradeoffDomain, string> = { skills: "Transferable Skills", growth: "Growth", location: "Location", values: "Values", "x-factor": "X-Factor", teammates: "Teammates", supervisor: "Supervisor" };

function clean(values: Array<string | undefined>, limit = 2) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].slice(0, limit);
}

function contextFor(domain: SalaryTradeoffDomain, progress: ParticipantModuleProgress[]): DomainContext | undefined {
  const source = progress.find((item) => item.moduleId === sourceIds[domain]);
  if (source?.status !== "completed") return;
  if (domain === "location") {
    const response = source.responses as unknown as LocationResponse;
    const locations = [...(response.locations ?? [])].sort((a, b) => a.order - b.order);
    const primary = locations.find((item) => item.id === response.primaryLocationId) ?? locations[0];
    const values = clean([primary?.label, ...(primary?.prioritizedReasons ?? []).sort((a, b) => a.priority - b.priority).map((item) => item.customLabel || item.label)]);
    if (!values.length && response.relocationOpenness === "stay") values.push("staying where you are");
    return values.length ? { domain, label: labels[domain], values, sourceCompletedAt: source.completedAt } : undefined;
  }
  const ranked = [...(source.result?.rankedItems ?? [])].sort((a, b) => a.rank - b.rank).map((item) => item.label);
  const values = clean(ranked.length ? ranked : source.result?.highlights ?? []);
  return values.length ? { domain, label: labels[domain], values, sourceCompletedAt: source.completedAt } : undefined;
}

function roundAmount(value: number, period: SalaryResponse["compensationPeriod"]) {
  if (period === "hourly") {
    const increment = value >= 100 ? 1 : value >= 40 ? .5 : .25;
    return Math.round(value / increment) * increment;
  }
  const increment = value >= 200000 ? 5000 : value >= 50000 ? 1000 : value >= 10000 ? 500 : 100;
  return Math.round(value / increment) * increment;
}

function descriptions(context: DomainContext) {
  const named = context.values.map((value) => `“${value}”`).join(" and ");
  const copy: Record<SalaryTradeoffDomain, [string, string]> = {
    skills: [`Regularly uses strengths you identified, including ${named}.`, `Offers less regular opportunity to use strengths such as ${named}.`],
    growth: [`Provides meaningful opportunity to grow in ${named}.`, `Provides less opportunity to develop in ${named}.`],
    location: [`Fits what you identified about where you want to live and work, including ${named}.`, `Fits your identified location preferences significantly less well.`],
    values: [`Aligns strongly with values you identified, including ${named}.`, `Offers less alignment with values such as ${named}.`],
    "x-factor": [`Makes regular room for X-Factors you identified, including ${named}.`, `Makes less regular use of X-Factors such as ${named}.`],
    teammates: [`Offers a teammate environment aligned with ${named}.`, `Offers less alignment with the teammate qualities you identified.`],
    supervisor: [`Offers supervisor qualities aligned with ${named}.`, `Offers less alignment with the supervisor qualities you identified.`],
  };
  return copy[context.domain];
}

export function salaryTradeoffInputKey(response: SalaryResponse, progress: ParticipantModuleProgress[]) {
  const sources = domainOrder.map((domain) => { const source = progress.find((item) => item.moduleId === sourceIds[domain]); return `${domain}:${source?.completedAt ?? "none"}`; }).join("|");
  return [response.currency, response.compensationPeriod, response.financialFloor, response.fiveYearGoal, sources].join("|");
}

export function generateSalaryTradeoffs(response: SalaryResponse, progress: ParticipantModuleProgress[]): SalaryTradeoffScenario[] {
  const floor = response.financialFloor ?? 0;
  const statedGoal = response.fiveYearGoal ?? floor;
  const upper = statedGoal > floor ? statedGoal : floor + Math.max(response.compensationPeriod === "hourly" ? 5 : 5000, floor * .15);
  const span = Math.max(upper - floor, response.compensationPeriod === "hourly" ? 2 : 2000);
  const contexts = domainOrder.flatMap((domain) => contextFor(domain, progress) ?? []).slice(0, 6);
  const bands: Array<[number, number]> = [[.16,.42],[.24,.70],[.10,.86],[.46,.78],[.34,.90],[.20,.58]];
  return contexts.map((context, index) => {
    const [lowBand, highBand] = bands[index];
    const lower = Math.max(floor, roundAmount(floor + span * lowBand, response.compensationPeriod));
    let higher = Math.max(lower, roundAmount(floor + span * highBand, response.compensationPeriod));
    if (higher === lower) higher = roundAmount(lower + (response.compensationPeriod === "hourly" ? .5 : Math.max(500, span * .1)), response.compensationPeriod);
    const [aligned, lessAligned] = descriptions(context);
    const higherOnA = index % 2 === 1;
    return {
      id: `salary-tradeoff-v1-${context.domain}`,
      domain: context.domain,
      domainLabel: context.label,
      contextLabels: context.values,
      sourceCompletedAt: context.sourceCompletedAt,
      optionA: higherOnA ? { amount: higher, alignment: "weaker", description: lessAligned } : { amount: lower, alignment: "stronger", description: aligned },
      optionB: higherOnA ? { amount: lower, alignment: "stronger", description: aligned } : { amount: higher, alignment: "weaker", description: lessAligned },
    };
  });
}

export function compensationPerspective(scenarios: SalaryTradeoffScenario[]) {
  const completed = scenarios.filter((scenario) => scenario.choice && scenario.difficulty);
  const aligned = completed.filter((scenario) => (scenario.choice === "a" ? scenario.optionA : scenario.optionB).alignment === "stronger");
  const compensation = completed.filter((scenario) => !aligned.includes(scenario));
  const difficult = completed.filter((scenario) => scenario.difficulty === "very");
  let summary = completed.length ? "Your choices were mixed, suggesting that compensation matters differently depending on what it is competing with." : "There were not enough completed personalized comparisons to identify a compensation pattern yet.";
  if (completed.length && aligned.length === completed.length) summary = "Once your financial floor was met, you consistently chose stronger alignment over higher compensation in these scenarios.";
  else if (completed.length && compensation.length === completed.length) summary = "Once your financial floor was met, higher compensation consistently carried more weight in these scenarios.";
  else if (completed.length) summary = `Once your financial floor was met, you chose stronger alignment when considering ${aligned.map((item) => item.domainLabel).join(" and ") || "none of these areas"}, while compensation carried more weight when compared with ${compensation.map((item) => item.domainLabel).join(" and ") || "none of these areas"}.`;
  return { summary, aligned: aligned.map((item) => item.domainLabel), compensation: compensation.map((item) => item.domainLabel), difficult: difficult.map((item) => item.domainLabel) };
}
