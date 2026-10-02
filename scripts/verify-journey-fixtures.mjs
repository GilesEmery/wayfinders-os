// Start preview:journey-fixtures first. This verifies fictitious rendered pages only.
import assert from 'node:assert/strict';
for (const count of [0, 1, 3, 4]) {
  const headers = count === 4 ? {} : { 'x-fixture-count': String(count) };
  const pages = {};
  for (const route of ['dashboard', 'my-journey']) {
    const response = await fetch(`http://127.0.0.1:4327/${route}`, { headers });
    assert.equal(response.status, 200);
    pages[route] = await response.text();
  }
  const dashboard = pages.dashboard;
  const journey = pages['my-journey'];
  assert.equal((dashboard.match(/<article class="participant-course-card/g) ?? []).length, Math.min(count, 3));
  assert.ok(dashboard.includes('href="/my-journey">View all'));
  const active = journey.split('Active experiences (')[1].split('</section>')[0];
  assert.equal((active.match(/<article class="participant-course-card/g) ?? []).length, count);
  assert.ok(journey.includes(`Active experiences (<!-- -->${count}<!-- -->)`));
  if (count === 0) assert.ok(journey.includes('Completed experiences (<!-- -->0'));
  if (count === 4) {
    assert.ok(journey.includes('cohort=c1') && journey.includes('cohort=c2'));
    assert.ok(journey.includes('/account/results/personal-impact-statement/fixture-pis-result'));
    assert.ok(journey.includes('Completed experiences (<!-- -->4'));
    assert.ok(dashboard.indexOf('Community Practice</h2>') < dashboard.indexOf('Personal Impact Statement</h2>'));
    const refreshed = await (await fetch('http://127.0.0.1:4327/my-journey')).text();
    assert.equal((refreshed.match(/<article class="participant-course-card/g) ?? []).length, 8);
  }
  console.log(`PASS fixture ${count}: Dashboard ${Math.min(count, 3)} cards; My Journey ${count} active cards`);
}
