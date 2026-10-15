import "./Journey.css";
import Reveal from "../Reveal";

const journeySteps = [
  {
    title: "Concept",
    summary: "From brand brief to sensory direction, we shape the first fragrance statement.",
  },
  {
    title: "Formulation",
    summary: "Refined blends and laboratory precision turn ideas into stable, premium formulas.",
  },
  {
    title: "Manufacturing",
    summary: "Controlled filling, aerosol assembly and finishing at scale under one roof.",
  },
  {
    title: "Packaging",
    summary: "Elegant packaging, labeling and quality checks ready for brand launch.",
  },
];

const Journey = () => (
  <section className="journey-section" id="journey">
    <div className="journey-inner">
      <Reveal className="journey-headline">
        <span className="section-label">END-TO-END JOURNEY</span>
        <h2>Concept. Formulation. Manufacturing. Packaging.</h2>
        <p>
          We guide your product from an idea into a finished, shelf-ready fragrance or care solution with premium
          precision and manufacturing discipline.
        </p>
      </Reveal>

      <div className="journey-grid">
        {journeySteps.map((step, index) => (
          <Reveal className="journey-card" key={step.title} delay={index * 80}>
            <div className="journey-card-index">0{index + 1}</div>
            <h3>{step.title}</h3>
            <p>{step.summary}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Journey;
