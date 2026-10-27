import { APEST_QUESTIONS, APEST_SCALE, apestResults, type ApestAnswers } from "@/lib/experiences/builder/apest";

export function ApestResults({ answers }: { answers: ApestAnswers }) {
  const results = apestResults(answers);
  if (!results) return null;
  return <section className="apest-results" aria-label="APEST results">
    <header><p>Your gifts at a glance</p><h2>{results.allEqual ? "Your gifts are equally expressed" : `${results.strongest.map(item => item.domain.title).join(" + ")}: your primary ${results.strongest.length > 1 ? "gifts" : "gift"}`}</h2><p>Explore how you naturally contribute and how your gifts work together.</p></header>
    <div className="apest-score-grid">{results.ranked.map(({ domain, rank, label }) => <article className={rank === 1 ? "is-primary" : rank === 2 ? "is-secondary" : "is-supporting"} key={domain.key}><small>{label}</small><span>{domain.key}</span><h3>{domain.title}</h3></article>)}</div>
    {results.ranked.map(({ domain, label }) => <section key={domain.key} className="apest-domain-detail"><h3>{domain.key} · {domain.title} <small>{label}</small></h3><p>{domain.description}</p><dl><div><dt>Possible contribution</dt><dd>{domain.strength}</dd></div><div><dt>Growth to consider</dt><dd>{domain.growth}</dd></div><div><dt>Try this</dt><dd>{domain.practice}</dd></div></dl></section>)}
    <details><summary>Review all 25 responses</summary><dl>{APEST_QUESTIONS.map(q => <div key={q.key}><dt>{q.text}</dt><dd>{APEST_SCALE.find(option => option.value === answers[q.key])?.label}</dd></div>)}</dl></details>
  </section>;
}
