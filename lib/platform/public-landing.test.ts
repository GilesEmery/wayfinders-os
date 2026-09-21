import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PUBLIC_LANDING_CAPABILITIES, PUBLIC_LANDING_JOURNEY, PUBLIC_LANDING_PATH, PUBLIC_LANDING_ROUTES } from "./public-landing.ts";

const pageSource = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");

test("the public landing page uses canonical participant routes", () => {
  assert.equal(PUBLIC_LANDING_ROUTES.dashboard, "/dashboard");
  assert.equal(PUBLIC_LANDING_ROUTES.trainings, "/trainings");
  assert.equal(PUBLIC_LANDING_ROUTES.lifeMappingU, "/experiences/life-mapping-u");
});

test("the public landing page includes the required content structure", () => {
  assert.equal(PUBLIC_LANDING_CAPABILITIES.length, 5);
  assert.equal(PUBLIC_LANDING_PATH.length, 5);
  assert.equal(PUBLIC_LANDING_JOURNEY.length, 7);
  assert.match(pageSource, /Discover your purpose/);
  assert.match(pageSource, /Enter Purpose OS/);
  assert.match(pageSource, /Explore Trainings/);
  assert.match(pageSource, /Explore Life Mapping U/);
});

test("the landing page keeps authentication client-side and exposes no course content", () => {
  assert.match(pageSource, /PublicLandingAuthLink/);
  assert.doesNotMatch(pageSource, /participant-course|course-content|experience_sections|companion_modules/);
});

test("the landing page has semantic responsive sections and valid footer destinations", () => {
  assert.match(pageSource, /<PlatformHeader \/>/);
  assert.match(pageSource, /<main>/);
  assert.match(pageSource, /<PlatformFooter \/>/);
  assert.match(pageSource, /aria-labelledby=/);
  assert.match(pageSource, /PUBLIC_LANDING_ROUTES\.trainings/);
});
