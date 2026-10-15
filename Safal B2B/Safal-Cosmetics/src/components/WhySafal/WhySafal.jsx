import "./WhySafal.css";
import Reveal from "../Reveal";

const reasons = [
  {
    title: "360° Fragrance Services",
    detail: "From aroma concept to finished bottle, every step is built for brand distinction.",
  },
  {
    title: "Quality-Focused Process",
    detail: "Stringent testing, cleanroom filling and premium quality checks keep every batch consistent.",
  },
  {
    title: "Scalable Production",
    detail: "Flexible runs, reliable timelines and manufacturing scale for small brands to national launches.",
  },
  {
    title: "Trusted Delivery",
    detail: "Dependable timelines and transparent communication for B2B teams that depend on precision.",
  },
];

const WhySafal = () => (
  <section className="why-section" id="why-safal">
    <div className="why-inner">
      <Reveal className="why-header">
        <span className="section-label">WHY SAFAL</span>
        <h2>Choose a partner that understands both fragrance and manufacturing.</h2>
      </Reveal>

      <div className="why-grid">
        {reasons.map((item, index) => (
          <Reveal className="why-card" key={item.title} delay={index * 90}>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default WhySafal;
