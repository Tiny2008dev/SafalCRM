import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import safalLogo from "../../assets/images/safallogo.png";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const crmBaseUrl = (import.meta.env.VITE_CRM_URL || "").trim().replace(/\/+$/, "");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleNavClick = (e, targetHash) => {
    e.preventDefault();
    closeMenu();

    if (location.pathname === "/") {
      if (targetHash === "#home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const element = document.querySelector(targetHash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      navigate(`/${targetHash}`);
    }
  };

  return (
    <header
      className={`navbar-wrapper ${
        scrolled ? "navbar-scrolled" : ""
      }`}
    >
      {/* Top Contact Information Bar */}
      <div className="top-contact-bar">
        <div className="top-contact-inner">
          <div className="top-contact-item">
            <span className="top-contact-icon">✉</span>
            <a href="mailto:safalcosmetics@gmail.com">
              safalcosmetics@gmail.com
            </a>
          </div>

          <div className="top-contact-item">
            <span className="top-contact-icon">☎</span>
            <a href="tel:+919876543210">
              +91 98765 43210
            </a>
          </div>

          <div className="top-contact-item top-address">
            <span className="top-contact-icon">⌖</span>
            <span>
              Nallasopara Mumbai ,India
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="navbar" aria-label="Main navigation">
        <a
          href="/#home"
          className="navbar-brand"
          onClick={(e) => handleNavClick(e, "#home")}
        >
          <img
            src={safalLogo}
            alt="Safal Cosmetics"
            className="navbar-logo"
          />
        </a>

        <div
          id="site-menu"
          className={`navbar-links ${
            menuOpen ? "menu-open" : ""
          }`}
        >
          <a onClick={(e) => handleNavClick(e, "#home")} href="/#home">
            Home
          </a>

          <a onClick={(e) => handleNavClick(e, "#about")} href="/#about">
            About
          </a>

          <a onClick={(e) => handleNavClick(e, "#services")} href="/#services">
            Capabilities
          </a>

          <a onClick={(e) => handleNavClick(e, "#clients")} href="/#clients">
            Our partners
          </a>

          <a onClick={(e) => handleNavClick(e, "#contact")} href="/#contact">
            Contact
          </a>

          <a
            href={crmBaseUrl ? `${crmBaseUrl}/login` : undefined}
            className="admin-login-link"
            onClick={closeMenu}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!crmBaseUrl}
          >
            Admin Login
          </a>
        </div>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label="Toggle navigation"
        >
          <span></span>
          <span></span>
        </button>

        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdm-vCMxguLdQTMSfg7o_JrHi22_PPxqnMG-RgRQ0MCI4fLZA/viewform?usp=header"
          onClick={closeMenu}
          className="quote-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Request a quote</span>
          <span className="quote-icon">↗</span>
        </a>
      </nav>
    </header>
  );
};

export default Navbar;
