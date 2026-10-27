import { FIVE_VOICES_DOMAINS } from "@/lib/experiences/builder/five-voices";
export function FiveVoicesIntroduction({ onBegin }: { onBegin: () => void }) {
  return <section className="apest-introduction" aria-label="About Five Voices">
    <p className="apest-intro-lede">Every person brings a different perspective to a conversation. This assessment explores five voices that can help you understand how you communicate, make decisions, and work with others.</p>
    <div className="apest-intro-gifts">{FIVE_VOICES_DOMAINS.map(voice => <article key={voice.key}><span>{voice.mark}</span><div><h3>{voice.title}</h3><p>{voice.description}</p></div></article>)}</div>
    <section className="apest-intro-expect"><h3>What to expect</h3><p>Take a few minutes to respond to 25 statements. Choose how often each one describes you in everyday situations.</p><p>Your profile will highlight your primary and secondary voices, show how all five fit together, and offer practical ways to communicate and collaborate. Use it to begin a conversation about what you bring and what you can learn from others.</p></section>
    <footer className="apest-actions"><button type="button" className="is-primary" onClick={onBegin}>Begin assessment →</button></footer>
  </section>;
}
