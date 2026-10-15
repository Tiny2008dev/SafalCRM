import "./Capabilities.css";
import Reveal from "../Reveal";

const capabilities = [
  {
    title: "Fragrance Solutions",
    description: "Custom perfumes, deodorants and body sprays built around your brand DNA.",
  },
  {
    title: "Aerosol Products",
    description: "Specialized aerosol filling and performance-driven spray systems.",
  },
  {
    title: "Personal Care",
    description: "Serious personal care formulas crafted for efficacy, sensorial luxury and compliance.",
  },
  {
    title: "Private Label Manufacturing",
    description: "Turnkey production from formulation to packaging for emerging and established labels.",
  },
];

const Capabilities = () => (
  <section className="capabilities-section" id="services">
    <div className="capabilities-inner">
      <Reveal className="capabilities-head">
        <span className="section-label">CAPABILITIES</span>
        <h2>Luxury manufacturing that scales with your brand.</h2>
        <p>
          Our capabilities combine sensory design, high-precision aerosol technology, and full private label production
          for the modern fragrance business.
        </p>
      </Reveal>

      <div className="capabilities-grid">
        {capabilities.map((item, index) => (
          <Reveal className="capability-card" key={item.title} delay={index * 100}>
            <div className="capability-mark">{index + 1}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Capabilities;
