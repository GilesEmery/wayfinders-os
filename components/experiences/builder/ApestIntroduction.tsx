export function ApestIntroduction({ onBegin }: { onBegin: () => void }) {
  return <section className="apest-introduction" aria-label="About APEST">
    <p className="apest-intro-lede">God gives different gifts to people so that, together, we can help others grow and participate in his mission. APEST explores five ways those gifts can take shape in everyday life.</p>
    <div className="apest-intro-gifts">
      <article><span>A</span><div><h3>Apostle</h3><p>Sees possibilities, starts new things, and helps others move toward a shared vision.</p></div></article>
      <article><span>P</span><div><h3>Prophet</h3><p>Listens for God’s heart, speaks truth, and draws attention to justice and faithfulness.</p></div></article>
      <article><span>E</span><div><h3>Evangelist</h3><p>Shares good news, builds connections, and invites others to become part of the story.</p></div></article>
      <article><span>S</span><div><h3>Shepherd</h3><p>Cares for people, nurtures belonging, and walks alongside others as they grow.</p></div></article>
      <article><span>T</span><div><h3>Teacher</h3><p>Makes ideas clear and helps others understand, practice, and apply what they are learning.</p></div></article>
    </div>
    <section className="apest-intro-expect"><h3>What to expect</h3><p>Take a few minutes to respond to 25 statements. Choose how often each one describes you, thinking about your everyday life rather than how you wish to be.</p><p>Your results will highlight your primary and secondary gifts, with practical ways to develop each area. Use your profile as a starting point for reflection, conversation, and growth.</p></section>
    <footer className="apest-actions"><button type="button" className="is-primary" onClick={onBegin}>Begin assessment →</button></footer>
  </section>;
}
