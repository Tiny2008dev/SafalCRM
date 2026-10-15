import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./ServicePage.css";

import heroImg from "../../assets/images/hero.png";
import hero2Img from "../../assets/images/hero2.png";
import aboutImg from "../../assets/images/About.jpg";
import perfumeImg from "../../assets/images/perfumeimg.png";
import productPerfumeImg from "../../assets/images/product_perfume.png";

const serviceData = {
  "fragrance-solutions": {
    title: "Fragrance Solutions",
    subtitle: "Creating memorable fragrances for distinctive brands.",
    description:
      "Safal Cosmetics provides complete fragrance manufacturing solutions, helping brands develop unique products from concept to production.",
    heroImage: perfumeImg,
    services: [
      "Custom fragrance development",
      "Perfume manufacturing",
      "Body spray production",
      "Deodorant formulations",
      "Packaging support",
    ],
  },

  "aerosol-products": {
    title: "Aerosol Products",
    subtitle: "Reliable aerosol solutions engineered for performance.",
    description:
      "We manufacture a range of aerosol-based products with a focus on quality, consistency and efficient production.",
    heroImage: hero2Img,
    services: [
      "Aerosol manufacturing",
      "Air fresheners",
      "Body sprays",
      "Custom aerosol formulations",
      "Private label production",
    ],
  },

  "personal-care": {
    title: "Personal Care",
    subtitle: "Quality personal care products built around your brand.",
    description:
      "From formulation to finished packaging, we help brands create personal care products tailored to their customers.",
    heroImage: aboutImg,
    services: [
      "Skin care products",
      "Body care",
      "Grooming products",
      "Custom formulations",
      "Brand-specific packaging",
    ],
  },

  "private-label-manufacturing": {
    title: "Private Label Manufacturing",
    subtitle: "Your brand. Our manufacturing expertise.",
    description:
      "Safal Cosmetics supports businesses throughout the complete product development journey, from idea and formulation to manufacturing and delivery.",
    heroImage: productPerfumeImg,
    services: [
      "Product concept development",
      "Custom formulation",
      "Manufacturing",
      "Packaging solutions",
      "Quality control",
    ],
  },
};


/* --------------------------------------------------
   ACCORDION GALLERY
-------------------------------------------------- */

const galleryItems = [
  {
    title: "Fragrance Solutions",
    subtitle: "Alcoholic Fragrances & Development",
    image: perfumeImg,
    slug: "fragrance-solutions",
  },
  {
    title: "Aerosol Products",
    subtitle: "Air Fresheners & Body Sprays",
    image: hero2Img,
    slug: "aerosol-products",
  },
  {
    title: "Personal Care",
    subtitle: "Grooming & Skin Care Formulations",
    image: aboutImg,
    slug: "personal-care",
  },
  {
    title: "Private Label",
    subtitle: "Full End-to-End Brand Manufacturing",
    image: productPerfumeImg,
    slug: "private-label-manufacturing",
  },
];


function AccordionGallery({ currentServiceId }) {
  const navigate = useNavigate();
  const initialIndex = Math.max(
    0,
    galleryItems.findIndex((item) => item.slug === currentServiceId)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  const handleSelect = (index, slug) => {
    setActiveIndex(index);
    if (slug && slug !== currentServiceId) {
      navigate(`/services/${slug}`);
    }
  };

  return (
    <div className="accordion-gallery">
      {galleryItems.map((item, index) => {
        const isCurrent = item.slug === currentServiceId;
        const isActive = activeIndex === index || isCurrent;

        return (
          <div
            key={item.title}
            className={`accordion-item ${isActive ? "active" : ""}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => handleSelect(index, item.slug)}
            style={{
              backgroundImage: `url(${item.image})`,
            }}
          >
            <div className="accordion-overlay" />

            <div className="accordion-number">
              0{index + 1}
            </div>

            <div className="accordion-content">
              <div className="accordion-content-inner">
                <span>{item.title}</span>

                <h3>{item.subtitle}</h3>

                <div className="accordion-arrow">
                  ↗
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* --------------------------------------------------
   SERVICE PAGE
-------------------------------------------------- */

const ServicePage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const service = serviceData[serviceId];

  if (!service) {
    return (
      <main className="service-not-found">
        <span>SAFAL COSMETICS</span>

        <h1>Service not found</h1>

        <button onClick={() => navigate("/")}>
          Back to Home
        </button>
      </main>
    );
  }

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/#services");
    }
  };

  return (
    <main className="service-page">

      {/* ================= HERO ================= */}

      <section className="service-hero">

        <div
          className="service-hero-background"
          style={{
            backgroundImage: `linear-gradient(
              90deg,
              rgba(5, 14, 25, 0.94) 0%,
              rgba(7, 19, 33, 0.78) 40%,
              rgba(7, 19, 33, 0.35) 75%,
              rgba(7, 19, 33, 0.2) 100%
            ), url(${service.heroImage || heroImg})`,
          }}
        />

        <div className="service-hero-content">

          <button
            className="back-button"
            onClick={handleBack}
          >
            ← Back
          </button>

          <div className="service-label">
            SAFAL COSMETICS
            <span>•</span>
            OUR SERVICES
          </div>

          <h1>{service.title}</h1>

          <p className="service-subtitle">
            {service.subtitle}
          </p>

          <p className="service-description">
            {service.description}
          </p>

          <div className="hero-scroll">
            <span>SCROLL TO EXPLORE</span>
            <div />
          </div>

        </div>

      </section>


      {/* ================= PRODUCT GALLERY ================= */}

      <section className="gallery-section">

        <div className="gallery-heading">

          <div>
            <span className="section-label">
              OUR PRODUCT RANGE
            </span>

            <h2>
              Products made
              <br />
              at our premise.
            </h2>
          </div>

          <p>
            From fragrances and perfumes to aerosols,
            personal care and private-label products,
            our manufacturing capabilities are built
            around your brand requirements.
          </p>

        </div>


        <AccordionGallery currentServiceId={serviceId} />

      </section>


      {/* ================= SERVICES ================= */}

      <section className="service-details">

        <div className="details-heading">

          <span className="section-label">
            WHAT WE OFFER
          </span>

          <h2>
            Built around
            <br />
            your requirements.
          </h2>

          <p>
            Our manufacturing process can be adapted
            to your product concept, formulation,
            packaging and production requirements.
          </p>

        </div>


        <div className="service-list">

          {service.services.map((item, index) => (

            <div
              className="service-list-item"
              key={item}
              onClick={() => navigate("/#contact")}
              style={{ cursor: "pointer" }}
            >

              <span>
                0{index + 1}
              </span>

              <h3>
                {item}
              </h3>

              <div>
                ↗
              </div>

            </div>

          ))}

        </div>

      </section>


      {/* ================= CTA ================= */}

      <section className="service-cta">

        <div
          className="cta-background"
          style={{
            backgroundImage: `linear-gradient(
              rgba(7, 18, 31, 0.87),
              rgba(7, 18, 31, 0.92)
            ), url(${service.heroImage || hero2Img})`,
          }}
        />

        <div className="cta-content">

          <span className="section-label">
            READY TO BUILD YOUR PRODUCT?
          </span>

          <h2>
            Let's create something
            <br />
            <em>exceptional.</em>
          </h2>

          <p>
            Tell us about your product and let
            Safal Cosmetics help bring your idea
            into production.
          </p>

          <button
            onClick={() => navigate("/#contact")}
          >
            Request a Quote
            <span>↗</span>
          </button>

        </div>

      </section>

    </main>
  );
};

export default ServicePage;