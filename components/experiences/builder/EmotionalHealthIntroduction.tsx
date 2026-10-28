export function EmotionalHealthIntroduction({ onBegin }: { onBegin: () => void }) {
  return <section className="apest-introduction" aria-label="About Emotional Health">
    <p className="apest-intro-lede">This assessment offers clarity and awareness as you grow in your inner life and in how you relate to others. It is not meant to grade you or label you.</p>
    <div className="apest-intro-gifts">{[
      ["Self-Awareness", "Notice your feelings and understand how they influence you."],
      ["Self-Management", "Reflect on how you respond to emotions, pressure, and everyday choices."],
      ["Social Awareness", "Notice and understand the feelings and experiences of others."],
      ["Relationship Management", "Reflect on connection, care, and how you relate to others."],
    ].map(([title, description], index) => <article key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
    <section className="apest-intro-expect"><h3>What to expect</h3><p>Respond honestly to 40 statements across eight short pages. Choose a point from Strongly Disagree to Strongly Agree, thinking about your everyday life. Each statement needs a response; an untouched slider does not count as an answer.</p><p>You can save and return later. Your results will show four areas for prayerful reflection, conversation, and growth.</p></section>
    <footer className="apest-actions"><button type="button" className="is-primary" onClick={onBegin}>Begin assessment →</button></footer>
  </section>;
}
