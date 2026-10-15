
import "./Hero.css";
import heroImage from "../../assets/images/hero2.png";

const Hero = () => (
  <section
    className="hero"
    id="home"
    style={{ "--hero-image": `url(${heroImage})` }}
  >
    <div className="hero-shade" aria-hidden="true"></div>

    <div className="hero-content">
      <div className="hero-heading">
        <h1>
          <span>SAFAL</span>
          <em>COSMETICS</em>
        </h1>
      </div>

      <p className="hero-description">
        A manufacturing partner for fragrance and personal-care brands
        that care about the formula, the finish, and the next production run.
      </p>

      <div className="hero-buttons">
        {/* Google Form Button */}
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdm-vCMxguLdQTMSfg7o_JrHi22_PPxqnMG-RgRQ0MCI4fLZA/viewform?usp=header"
          className="hero-primary-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Start a conversation</span>
          <b>→</b>
        </a>

        {/* Capabilities Button */}
        <a href="#services" className="hero-secondary-btn">
          See our capabilities
        </a>
      </div>

      <div className="hero-proof">
        <span>From brief to shelf</span>
        <span>Formula · fill · finish</span>
      </div>
    </div>

  </section>
);

export default Hero;