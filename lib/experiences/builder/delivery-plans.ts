import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { DeliveryPlanStructure } from "./types";

type Db = ReturnType<typeof createAdminSupabaseClient>;

export async function getDeliveryPlanTemplate(templateId: string, db: Db = createAdminSupabaseClient()) {
  const { data, error } = await db.from("delivery_plan_templates").select("*").eq("id", templateId).maybeSingle();
  if (error) throw new Error(`Unable to load delivery plan template: ${error.message}`);
  return data;
}

export async function getDeliveryPlanTemplatesForExperience(experienceId: string, db: Db = createAdminSupabaseClient()) {
  const { data, error } = await db.from("delivery_plan_templates").select("*").eq("experience_id", experienceId).order("updated_at", { ascending: false });
  if (error) throw new Error(`Unable to load delivery plan templates: ${error.message}`);
  return data ?? [];
}

export async function getCohortCoursePlan(planId: string, db: Db = createAdminSupabaseClient()) {
  const { data, error } = await db.from("cohort_course_plans").select("*").eq("id", planId).maybeSingle();
  if (error) throw new Error(`Unable to load cohort course plan: ${error.message}`);
  return data;
}

export async function getActiveCohortCoursePlan(cohortId: string, db: Db = createAdminSupabaseClient()) {
  const { data, error } = await db.from("cohort_course_plans").select("*").eq("cohort_id", cohortId).eq("status", "active").maybeSingle();
  if (error) throw new Error(`Unable to load active cohort course plan: ${error.message}`);
  return data;
}

export async function getCohortCoursePlanStructure(planId: string, db: Db = createAdminSupabaseClient()): Promise<DeliveryPlanStructure | null> {
  const plan = await getCohortCoursePlan(planId, db);
  if (!plan) return null;
  const [moduleResult, sectionResult] = await Promise.all([
    db.from("cohort_course_plan_modules").select("*").eq("plan_id", plan.id).order("sort_order"),
    db.from("cohort_course_plan_sections").select("*").eq("plan_id", plan.id).order("sort_order"),
  ]);
  if (moduleResult.error || sectionResult.error) throw new Error("Unable to load cohort course plan structure.");
  const sections = sectionResult.data ?? [];
  return { plan, modules: (moduleResult.data ?? []).map((module) => ({ ...module, sections: sections.filter((section) => section.plan_module_id === module.id) })) };
}
