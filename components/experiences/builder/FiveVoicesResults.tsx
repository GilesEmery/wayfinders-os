import { FIVE_VOICES_QUESTIONS, FIVE_VOICES_SCALE, fiveVoicesResults, type FiveVoicesAnswers } from "@/lib/experiences/builder/five-voices";

export function FiveVoicesResults({ answers }: { answers: FiveVoicesAnswers }) {
  const results = fiveVoicesResults(answers);
  if (!results) return null;
  return <section className="apest-results" aria-label="Five Voices results">
    <header><p>Your voices at a glance</p><h2>{results.allEqual ? "Your voices are equally expressed" : `${results.strongest.map(item => item.domain.title).join(" + ")}: your primary ${results.strongest.length > 1 ? "voices" : "voice"}`}</h2><p>Explore how you naturally communicate and how your voices work together.</p></header>
    <div className="apest-score-grid">{results.ranked.map(({ domain, rank, label }) => <article className={rank === 1 ? "is-primary" : rank === 2 ? "is-secondary" : "is-supporting"} key={domain.key}><small>{label}</small><span>{domain.mark}</span><h3>{domain.title}</h3></article>)}</div>
    {results.ranked.map(({ domain, label }) => <section key={domain.key} className="apest-domain-detail"><h3>{domain.title} <small>{label}</small></h3><p>{domain.description}</p><dl><div><dt>Possible contribution</dt><dd>{domain.strength}</dd></div><div><dt>How you communicate</dt><dd>{domain.communication}</dd></div><div><dt>Working with others</dt><dd>{domain.collaboration}</dd></div><div><dt>Growth to consider</dt><dd>{domain.growth}</dd></div><div><dt>Try this</dt><dd>{domain.practice}</dd></div></dl></section>)}
    <details><summary>Review all 25 responses</summary><dl>{FIVE_VOICES_QUESTIONS.map(q => <div key={q.key}><dt>{q.text}</dt><dd>{FIVE_VOICES_SCALE.find(option => option.value === answers[q.key])?.label}</dd></div>)}</dl></details>
  </section>;
}
