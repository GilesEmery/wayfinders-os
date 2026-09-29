import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("keeps Course Logo and Header Logo separate in customization and delivery", () => {
  const runtime = readFileSync(new URL("../../../components/experiences/builder/ParticipantCourseRuntime.tsx", import.meta.url), "utf8");
  const customization = readFileSync(new URL("../../../components/admin/CourseCustomizationWorkspace.tsx", import.meta.url), "utf8");
  const platformHeader = readFileSync(new URL("../../../components/platform/PlatformHeader.tsx", import.meta.url), "utf8");
  const participantPage = readFileSync(new URL("../../../app/experiences/[slug]/course/[moduleKey]/[lessonKey]/[sectionKey]/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(runtime, /participant-course-title-lockup/);
  assert.doesNotMatch(runtime, /<h1>{courseTitle}<\/h1>/);
  assert.match(runtime, /participant-outline-identity[\s\S]*logoUrl && <Image className="participant-course-logo"/);
  assert.match(platformHeader, /contextLogoUrl && <Image/);
  assert.match(platformHeader, /<strong>{contextTitle}<\/strong>/);
  assert.match(participantPage, /contextLogoUrl={result\.headerLogoUrl}/);
  assert.doesNotMatch(customization, /Use Course Logo/);
  assert.match(customization, /"Header Logo"/);
  assert.match(css, /\.platform-header-context img{[^}]*height:36px/);
  assert.doesNotMatch(css, /course-header-image \.participant-course-header>div[^}]*display:none/);
});
