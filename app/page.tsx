import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PublicLandingAuthLink } from "@/components/platform/PublicLandingAuthLink";
import { PUBLIC_LANDING_CAPABILITIES, PUBLIC_LANDING_JOURNEY, PUBLIC_LANDING_PATH, PUBLIC_LANDING_ROUTES } from "@/lib/platform/public-landing";
import "./purpose-landing.css";

export const metadata: Metadata = {
  title: "PurposeOS by Wayfinders",
  description: "A connected platform for discovering purpose, developing as a leader, connecting with others, and turning insight into meaningful action.",
};

export default function Home() {
  return (
    <div className="purpose-landing">
      <PlatformHeader />

      <main>
        <section className="purpose-landing-hero" aria-labelledby="purpose-landing-title">
          <div className="purpose-hero-content">
            <p className="purpose-kicker">Purpose OS</p>
            <h1 id="purpose-landing-title">Discover your purpose.<br />Build what matters.<br /><em>Move forward with clarity.</em></h1>
            <p>PurposeOS, created by Wayfinders, is a connected platform for discovering purpose, developing as a leader, connecting with others, and turning insight into meaningful action.</p>
            <div className="purpose-cta-row">
              <PublicLandingAuthLink className="purpose-button purpose-button-primary">Enter Purpose OS</PublicLandingAuthLink>
              <Link className="purpose-button purpose-button-quiet" href={PUBLIC_LANDING_ROUTES.trainings}>Explore Trainings</Link>
            </div>
          </div>
        </section>

        <section className="purpose-capabilities purpose-landing-section" aria-labelledby="capabilities-title">
          <header className="purpose-section-heading">
            <p className="purpose-kicker">The platform</p>
            <h2 id="capabilities-title">What you can do in Purpose OS</h2>
            <p>Move from reflection to meaningful action through connected tools, experiences, and relationships.</p>
          </header>
          <ol>{PUBLIC_LANDING_CAPABILITIES.map(([number, title, copy]) => <li key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
        </section>

        <section className="purpose-lmu-feature" aria-labelledby="lmu-feature-title">
          <div className="purpose-lmu-visual" aria-hidden="true">
            <Image src="/brand/lmu/lmu-u-mark-white.png" alt="" width={360} height={360} />
            <span>Begin with your story</span>
          </div>
          <div className="purpose-lmu-copy">
            <p className="purpose-kicker">Life Mapping U</p>
            <h2 id="lmu-feature-title">Understand the patterns in your story. Clarify what matters. Discover where you may be headed next.</h2>
            <p>Life Mapping U is a guided discovery experience that helps you identify the strengths, interests, values, experiences, relationships, and priorities that have shaped who you are.</p>
            <p>By looking carefully at where you have experienced energy, success, growth, and meaning, you can begin to see patterns that point toward the kinds of work, relationships, environments, and opportunities where you are most likely to thrive and make a meaningful contribution.</p>
            <Link className="purpose-text-link" href={PUBLIC_LANDING_ROUTES.lifeMappingU}>Explore Life Mapping U</Link>
          </div>
        </section>

        <section className="purpose-path purpose-landing-section" aria-labelledby="path-title">
          <header className="purpose-section-heading purpose-section-heading-wide"><p className="purpose-kicker">A connected path</p><h2 id="path-title">From discovery to multiplication.</h2></header>
          <ol>{PUBLIC_LANDING_PATH.map(([number, title, copy]) => <li key={title}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </section>

        <section className="purpose-journey purpose-landing-section" aria-labelledby="journey-title">
          <div className="purpose-journey-copy"><p className="purpose-kicker">Your journey</p><h2 id="journey-title">Your journey has a place to live here.</h2><p>PurposeOS brings your experiences, progress, results, communities, conversations, and next steps into one connected place.</p></div>
          <div className="purpose-journey-map" aria-label="PurposeOS connects these parts of your journey"><div><span>Purpose OS</span><strong>Your connected journey</strong></div><ul>{PUBLIC_LANDING_JOURNEY.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>

        <section className="purpose-together" aria-labelledby="together-title">
          <div><p className="purpose-kicker">Purpose in everyday life</p><h2 id="together-title">Helping everyday disciples and everyday leaders make everyday impact.</h2><div className="purpose-together-copy"><p>Purpose becomes clearer as we reflect, experiment, learn, build relationships, and contribute to the lives of others.</p><p>PurposeOS helps people connect who they are becoming with how they lead, serve, and show up each day.</p><p>Whether you are engaging locally or connecting with fellow Wayfinders across communities, PurposeOS helps people grow together, build what matters, and create movements for good.</p></div></div>
        </section>

        <section className="purpose-closing" aria-labelledby="closing-title">
          <p className="purpose-kicker">Your next step</p><h2 id="closing-title">Ready to move forward?</h2><p>Your PurposeOS journey starts wherever you are.</p>
          <div className="purpose-cta-row"><PublicLandingAuthLink className="purpose-button purpose-button-primary">Enter Purpose OS</PublicLandingAuthLink><Link className="purpose-button purpose-button-quiet" href={PUBLIC_LANDING_ROUTES.trainings}>Explore Trainings</Link></div>
        </section>
      </main>

      <PlatformFooter />
    </div>
  );
}
