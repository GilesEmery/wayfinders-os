import assert from "node:assert/strict";
import test from "node:test";
import { buildOperationalNavigation, buildPersonalNavigation, isPersonalNavigationItemActive } from "./dashboard-navigation.ts";
import { TRAINING_CATALOG_EMPTY_MESSAGE, trainingCatalogAccessLabel, trainingCatalogActionLabel } from "./training-catalog-policy.ts";

test("participant navigation separates enrolled Trainings from Explore Trainings", () => {
  const groups = buildPersonalNavigation();
  assert.deepEqual(groups.map((group) => group.label), ["My Journey", "Explore", "My Community", "My Account"]);
  assert.deepEqual(groups.find((group) => group.label === "My Journey")?.items.map((item) => item.label), ["My Dashboard", "My Trainings", "My Assessments", "My Cohorts"]);
  assert.deepEqual(groups.find((group) => group.label === "Explore")?.items, [{ label: "Trainings", href: "/trainings", icon: "trainings" }]);
  assert.equal(groups.find((group) => group.label === "My Journey")?.items.find((item) => item.label === "My Trainings")?.href, "/dashboard#trainings");
});

test("My Trainings and Explore Trainings active states cannot collide", () => {
  assert.equal(isPersonalNavigationItemActive("/trainings", "", "/trainings"), true);
  assert.equal(isPersonalNavigationItemActive("/trainings", "", "/dashboard#trainings"), false);
  assert.equal(isPersonalNavigationItemActive("/dashboard", "#trainings", "/trainings"), false);
  assert.equal(isPersonalNavigationItemActive("/dashboard", "#trainings", "/dashboard#trainings"), true);
  assert.equal(isPersonalNavigationItemActive("/dashboard", "#trainings", "/dashboard"), false);
  assert.equal(isPersonalNavigationItemActive("/dashboard", "", "/dashboard"), true);
});

test("participant navigation contains no Administration destinations", () => {
  assert.equal(buildPersonalNavigation().flatMap((group) => group.items).some((item) => item.href.startsWith("/admin")), false);
  assert.equal(buildOperationalNavigation("admin").some((group) => group.items.some((item) => item.href.startsWith("/admin"))), true);
});

test("catalog recognizes existing access without offering a duplicate enrollment action", () => {
  assert.equal(trainingCatalogAccessLabel(true, "in_progress", "open_enrollment"), "Already in My Trainings");
  assert.equal(trainingCatalogActionLabel(true, "in_progress", "open_enrollment"), "Continue Training");
  assert.equal(trainingCatalogActionLabel(true, "completed", "open_enrollment"), "Open Training");
});

test("catalog only advertises enrollment when the real admission policy allows it", () => {
  assert.equal(trainingCatalogActionLabel(true, null, "open_enrollment"), "View / Enroll");
  assert.equal(trainingCatalogActionLabel(true, null, "assigned"), "View Details");
  assert.equal(trainingCatalogAccessLabel(true, null, "assigned"), "Enrollment is assigned by Wayfinders staff");
});

test("catalog has a safe empty state", () => {
  assert.equal(TRAINING_CATALOG_EMPTY_MESSAGE, "No trainings are currently available to browse.");
});
