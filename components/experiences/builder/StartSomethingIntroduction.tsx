export function StartSomethingIntroduction({ onBegin }: { onBegin: () => void }) {
  return <main className="start-something-workflow start-something-introduction">
    <header className="start-something-heading">
      <h1>Start Something</h1>
      <p className="start-something-introduction-subtitle">Every great initiative begins somewhere.</p>
    </header>
    <div className="start-something-introduction-copy">
      <p>Have you ever felt a desire to start something, perhaps a business, ministry, movement, community initiative, or something entirely new, but weren&apos;t sure where to begin? Maybe you&apos;ve recognized a need, felt a burden for a cause, or had an idea developing for some time, but turning that idea into action has felt overwhelming.</p>
      <p><strong>Start Something is designed to help you move from an idea to a clear vision, a practical strategy, and meaningful action.</strong> Through a series of guided questions and reflections, you will begin identifying what you want to accomplish, what you already have available, what you still need, and the steps necessary to move forward.</p>
      <section aria-labelledby="start-something-expect">
        <h2 id="start-something-expect">What to Expect</h2>
        <p>Throughout this assessment, you will work through six stages:</p>
        <ol>
          <li><strong>Idea:</strong> Explore what you want to start, the problem or opportunity you see, and why it matters.</li>
          <li><strong>Inventory:</strong> Identify the experiences, skills, resources, and strengths you already possess, along with areas where you may need additional support.</li>
          <li><strong>Vision:</strong> Bring greater clarity to what you hope to accomplish, who you want to serve, and the impact you want to make.</li>
          <li><strong>Strategy:</strong> Begin developing a practical approach, considering the actions, priorities, potential obstacles, and timeline necessary to move your idea forward.</li>
          <li><strong>Network:</strong> Consider the relationships, partnerships, mentors, and connections that could help strengthen your initiative. You don&apos;t have to build something meaningful alone.</li>
          <li><strong>Progress and Next Steps:</strong> Identify where you currently are in the process and determine tangible steps you can take to continue moving forward.</li>
        </ol>
      </section>
      <section aria-labelledby="start-something-before">
        <h2 id="start-something-before">Before You Begin</h2>
        <p>This is not a test, and there are no right or wrong answers. Start Something is a tool for reflection, discovery, and planning. You may have a well-developed vision, or you may only have the beginning of an idea. Either is a great place to start.</p>
        <p>Take your time with each section, answer as thoughtfully and honestly as you can, and remember that your ideas and plans can continue to develop as you move through the process. You can save your progress and return to your work as needed.</p>
        <p><strong>You don&apos;t need to have all the answers, and you don&apos;t have to be an expert. You simply need to be willing to take the next step.</strong></p>
      </section>
      <footer className="start-something-introduction-encouragement">
        <p><strong>Let&apos;s Start Something!</strong></p>
        <div className="start-something-navigation"><button type="button" className="is-primary" onClick={onBegin}>Begin My Assessment</button></div>
      </footer>
    </div>
  </main>;
}
