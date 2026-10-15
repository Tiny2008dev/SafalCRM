import "./Manufacturing.css";
import Reveal from "../Reveal";

const metrics = [
  { value: "20+", label: "Years Experience" },
  { value: "360°", label: "Fragrance Services" },
  { value: "100k+", label: "Units Monthly" },
  { value: "24/7", label: "Dedicated Support" },
];

const capabilities = [
  {
    title: "Precision blending",
    detail: "High-performance fragrance concentrates and stable care formulas prepared to exact standards.",
  },
  {
    title: "Aerosol expertise",
    detail: "Controlled filling, valve systems and elegant spray performance for premium aerosol products.",
  },
  {
    title: "Packaging excellence",
    detail: "Brand-forward finishing, labeling and packaging support for polished shelf appeal.",
  },
];

const Manufacturing = () => (
  <section className="manufacturing-section" id="excellence">
    <div className="manufacturing-inner">
      <Reveal className="manufacturing-head">
        <span className="section-label">MANUFACTURING EXCELLENCE</span>
        <h2>Premium production built around discipline, quality and trust.</h2>
      </Reveal>

      <div className="manufacturing-grid">
        <div className="manufacturing-metrics">
          {metrics.map((metric) => (
            <Reveal className="metric-card" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </Reveal>
          ))}
        </div>

        <div className="manufacturing-detail">
          <Reveal className="manufacturing-copy">
            <p>
              Our Gujarat facility is designed to support fragrance brands with rigorous process control, modern
              aerosol lines and all private label manufacturing capabilities under one roof.
            </p>
          </Reveal>

          <div className="manufacturing-features">
            {capabilities.map((item, index) => (
              <Reveal className="feature-card" key={item.title} delay={index * 80}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Manufacturing;
