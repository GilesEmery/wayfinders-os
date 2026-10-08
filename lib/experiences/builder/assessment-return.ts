export const ASSESSMENT_CLOSE_MESSAGE = "wayfinders:close-course-assessment";

export function returnFromAssessment(destination: string) {
  if (window.self !== window.top && document.documentElement.classList.contains("embedded-assessment-document")) {
    window.parent.postMessage({ type: ASSESSMENT_CLOSE_MESSAGE }, window.location.origin);
    return;
  }
  window.location.assign(destination);
}
