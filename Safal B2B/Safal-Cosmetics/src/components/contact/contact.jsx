import "./Contact.css";
import Reveal from "../Reveal";

function Contact() {
  return (
    <section className="contact-section" id="contact">
      <Reveal className="contact-container">
        <div className="contact-content">
          <div className="contact-label"><span />GET IN TOUCH</div>
          <h2>Let's create<br /><span>something remarkable.</span></h2>
          <p>Have a product idea, fragrance concept or private label requirement? Tell us what you're looking for and our team will get back to you.</p>
          <a
            className="contact-button"
            href="https://docs.google.com/forms/d/e/1FAIpQLSdm-vCMxguLdQTMSfg7o_JrHi22_PPxqnMG-RgRQ0MCI4fLZA/viewform?usp=header"
            target="_blank"
            rel="noopener noreferrer"
          >
            Send an Enquiry <span>↗</span>
          </a>
        </div>
        <div className="contact-info">
          <div className="contact-info-card"><span className="info-label">WHAT WE WORK WITH</span><div className="info-list"><span>Perfumes</span><span>Air Fresheners</span><span>After Shave Lotion</span><span>Attars</span><span>Sanitizers</span><span>Gift Sets</span></div></div>
          <div className="contact-info-card"><span className="info-label">ENQUIRIES</span><a href="mailto:safalcosmetics@gmail.com" className="email-link">safalcosmetics@gmail.com</a></div>
        </div>
      </Reveal>
      <div className="contact-bottom"><span>PRIVATE LABEL</span><span className="contact-dot" /><span>CONTRACT MANUFACTURING</span><span className="contact-dot" /><span>FRAGRANCE SOLUTIONS</span></div>
    </section>
  );
}

export default Contact;
