import { PlatformShell } from "@/components/platform/PlatformShell";
import { AuthTrigger } from "@/components/platform/AuthTrigger";
import Link from "next/link";

export default function Home() {
  return (
    <PlatformShell>
      <div className="purpose-home">
        <section className="purpose-home-hero" aria-labelledby="purpose-home-title">
          <div>
            <p className="platform-eyebrow">Purpose OS</p>
            <h1 id="purpose-home-title">Discover your purpose. Build what matters. Move forward with clarity.</h1>
          </div>
          <div className="purpose-home-hero-copy">
            <p>Purpose OS, created by Wayfinders, is a connected platform designed to help people discover, develop, and activate their purpose.</p>
            <p>Inside Purpose OS, you can engage with assessments, trainings, cohorts, communities, resources, and practical tools that help you better understand your story, identify what matters most, develop as a leader, and take meaningful steps toward greater impact where you live, work, play, and serve.</p>
            <AuthTrigger className="platform-button" destination="/dashboard">Enter Purpose OS <span aria-hidden="true">→</span></AuthTrigger>
          </div>
        </section>

        <section className="purpose-home-place purpose-home-section" aria-labelledby="journey-place-title">
          <p className="platform-eyebrow">Your journey</p>
          <div>
            <h2 id="journey-place-title">Your journey has a place to live here.</h2>
            <div className="purpose-home-copy">
              <p>Purpose OS is more than a library of content. It is a place to see your journey take shape.</p>
              <p>Your dashboard brings together your progress, experiences, results, communities, conversations, and next steps in one place.</p>
              <p>As you grow, Purpose OS helps you stay connected to the people, Hubs, groups, and opportunities that are part of your journey.</p>
              <p>For some, that may mean working through Life Mapping U. For others, it may mean joining a cohort, connecting with a Hub, developing as a leader, building an initiative, or taking the next step toward something that has been taking shape for years.</p>
            </div>
            <article className="purpose-home-lmu">
              <p>Life Mapping U</p>
              <h3>Understand the patterns in your story. Clarify what matters. Discover where you may be headed next.</h3>
              <p>Life Mapping U is a guided discovery experience that helps you identify the strengths, interests, values, experiences, relationships, and priorities that have shaped who you are.</p>
              <p>By looking carefully at where you have experienced energy, success, growth, and meaning, you can begin to see patterns that point toward the kinds of work, relationships, environments, and opportunities where you are most likely to thrive and make a meaningful contribution.</p>
              <Link href="/experiences/life-mapping-u">Explore Life Mapping U <span aria-hidden="true">→</span></Link>
            </article>
          </div>
        </section>

        <section className="purpose-home-framework purpose-home-section" aria-labelledby="framework-title">
          <header>
            <p className="platform-eyebrow">A connected path</p>
            <h2 id="framework-title">From discovery to multiplication.</h2>
          </header>
          <ol>
            <li><span>01</span><div><h3>Discover</h3><p>Gain clarity about your story, strengths, values, patterns, interests, and opportunities.</p></div></li>
            <li><span>02</span><div><h3>Grow</h3><p>Develop the skills, habits, relationships, and perspectives needed to move forward.</p></div></li>
            <li><span>03</span><div><h3>Connect</h3><p>Engage with people, Hubs, cohorts, and communities that can support and challenge you.</p></div></li>
            <li><span>04</span><div><h3>Build</h3><p>Turn ideas, insights, and opportunities into meaningful action.</p></div></li>
            <li><span>05</span><div><h3>Multiply</h3><p>Use what you are learning and building to help others grow and create positive change.</p></div></li>
          </ol>
        </section>

        <section className="purpose-home-community purpose-home-section" aria-labelledby="community-title">
          <p className="platform-eyebrow">Purpose with others</p>
          <div>
            <h2 id="community-title">Purpose grows through action and relationship.</h2>
            <div className="purpose-home-copy">
              <p>We believe purpose becomes clearer as people reflect on their story, engage meaningful opportunities, build relationships, experiment, learn, and contribute to the lives of others.</p>
              <p>Purpose OS is designed to help make that journey visible, connected, and actionable.</p>
              <p>Whether you are engaging locally or connecting with fellow Wayfinders across communities, Purpose OS helps people grow together, lead well, build what matters, and create movements for good.</p>
            </div>
          </div>
        </section>

        <section className="purpose-home-together purpose-home-section" aria-labelledby="together-title">
          <header>
            <p className="platform-eyebrow">One journey home</p>
            <h2 id="together-title">What Purpose OS will bring together.</h2>
          </header>
          <ul>
            <li>Discovering and clarifying purpose</li>
            <li>Understanding your strengths, values, and story</li>
            <li>Developing as a leader</li>
            <li>Engaging in trainings and cohorts</li>
            <li>Connecting with Hubs and communities</li>
            <li>Tracking progress and key milestones</li>
            <li>Receiving resources and next-step guidance</li>
            <li>Collaborating with others around meaningful work</li>
            <li>Turning ideas, callings, and opportunities into movements for good</li>
          </ul>
        </section>

        <section className="purpose-home-final" aria-labelledby="welcome-title">
          <p>Whether you are just beginning to explore your purpose or are already leading, creating, serving, or building something meaningful, Purpose OS is designed to help you see where you are, understand what may be next, and move forward with others.</p>
          <div>
            <p className="platform-eyebrow">Created by Wayfinders</p>
            <h2 id="welcome-title">Welcome to Purpose OS. Your journey has a place to live here.</h2>
            <AuthTrigger className="purpose-home-final-button" destination="/dashboard">Enter Purpose OS <span aria-hidden="true">→</span></AuthTrigger>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
