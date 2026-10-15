import { useState } from "react";
import "./OwnerContact.css";
import ownerPhoto from "../../assets/images/hemant_mama.jpeg";

function OwnerContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="owner-contact">
      {/* Floating owner photo button */}
      <button
        className="owner-float-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open owner contact details"
        aria-expanded={isOpen}
      >
        <img src={ownerPhoto} alt="Hemant Chudasama" />
        <span className="owner-online-dot"></span>
      </button>

      {/* Contact popup */}
      {isOpen && (
        <div className="owner-card">
          <button
            className="owner-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close contact details"
          >
            ×
          </button>

          {/* Photo and owner information */}
          <div className="owner-header">
            <img
              src={ownerPhoto}
              alt="Hemant Chudasama"
              className="owner-card-photo"
            />

            <div className="owner-heading">
              <h3>Hemant Chudasama</h3>
              <p className="owner-role">Founder, Safal Cosmetics</p>
            </div>
          </div>

          {/* Contact details */}
          <div className="owner-details">
            <a href="tel:+919876543210">
              <span>☎</span>
              <strong>+91 98765 43210</strong>
            </a>

            <a href="mailto:safalcosmetics@gmail.com">
              <span>✉</span>
              <strong>safalcosmetics@gmail.com</strong>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerContact;