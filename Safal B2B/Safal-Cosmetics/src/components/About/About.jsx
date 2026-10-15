import "./About.css";
import Reveal from "../Reveal";

const About = () => {
  return (
    <section className="about-section" id="about">
      <div className="about-container">

        {/* Top Label */}
        <Reveal className="about-label">
          <span></span>
          WHO WE ARE
        </Reveal>

        {/* Main Heading */}
        <Reveal className="about-heading-wrapper" delay={80}>
          <h2 className="about-heading">
            The Manufacturing Partner Behind{" "}
            <span>Your Next Successful Brand.</span>
          </h2>
        </Reveal>

        {/* Description */}
        <Reveal className="about-content" delay={160}>
          <div className="about-description">
            <p>
              Safal Cosmetics is a trusted partner for businesses looking to
              transform fragrance and cosmetic ideas into high-quality products.
            </p>

            <p>
              From concept and formulation to manufacturing and production, we
              combine industry expertise with reliable processes to help brands
              build, launch and scale with confidence.
            </p>

            <a href="#services" className="about-btn">
              <span>Discover Our Expertise</span>
              <span className="about-btn-arrow">↗</span>
            </a>
          </div>

          {/* Side Information */}
          <div className="about-side-text">
            <span>BUILT FOR BRANDS</span>
            <p>
              Reliable manufacturing. Scalable production. Quality-focused
              solutions.
            </p>
          </div>
        </Reveal>

        {/* Stats */}
        <Reveal className="about-stats" delay={220}>

          <div className="about-stat">
            <h3>20<span>+</span></h3>
            <p>Years of<br />Experience</p>
          </div>

          <div className="about-stat">
            <h3>360<span>°</span></h3>
            <p>Fragrance<br />Solutions</p>
          </div>

          <div className="about-stat">
            <h3>B2B</h3>
            <p>Manufacturing<br />Partner</p>
          </div>

          <div className="about-stat about-stat-special">
            <h3>01</h3>
            <p>Vision — Your Brand,<br />Our Expertise</p>
          </div>

        </Reveal>

      </div>
    </section>
  );
};

export default About;
