import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Products.css";
import Reveal from "../Reveal";

const products = [
  {
    number: "01",
    icon: "✦",
    title: "Fragrance Solutions",
    slug: "fragrance-solutions",
    description:
      "Custom fragrance development and manufacturing for perfumes, deodorants, body sprays and personal care products.",
    tags: ["Perfumes", "Deodorants", "Body Sprays"],
  },
  {
    number: "02",
    icon: "◉",
    title: "Aerosol Products",
    slug: "aerosol-products",
    description:
      "Reliable aerosol manufacturing solutions developed with consistent quality, performance and production expertise.",
    tags: ["Aerosols", "Sprays", "Air Care"],
  },
  {
    number: "03",
    icon: "✿",
    title: "Personal Care",
    slug: "personal-care",
    description:
      "High-quality personal care formulations tailored to the needs of your brand and target customers.",
    tags: ["Skin Care", "Body Care", "Grooming"],
  },
  {
    number: "04",
    icon: "◇",
    title: "Private Label Manufacturing",
    slug: "private-label-manufacturing",
    description:
      "From concept and formulation to production and packaging, we help transform your idea into a finished product.",
    tags: ["B2B", "Custom Branding", "Packaging"],
  },
];

const Products = () => {
  const [activeCard, setActiveCard] = useState(0);
  const navigate = useNavigate();

  return (
    <section className="products-section" id="services">
      <div className="products-container">

        <Reveal className="products-heading">
          <span className="section-label">WHAT WE CREATE</span>

          <h2>
            Solutions Built For
            <span> Your Brand.</span>
          </h2>

          <p>
            From fragrance formulation to complete private-label manufacturing,
            Safal Cosmetics brings ideas to life with quality and precision.
          </p>
        </Reveal>

        <Reveal className="products-grid" delay={140}>
          {products.map((product, index) => (
            <div
              className={`product-card ${
                activeCard === index ? "active-card" : ""
              }`}
              key={index}
              onMouseEnter={() => setActiveCard(index)}
            >
              <div className="product-card-top">
                <span className="product-number">
                  {product.number}
                </span>

                <div className="product-icon">
                  {product.icon}
                </div>
              </div>

              <h3>{product.title}</h3>

              <p>{product.description}</p>

              <div className="product-tags">
                {product.tags.map((tag, tagIndex) => (
                  <span key={tagIndex}>{tag}</span>
                ))}
              </div>

              <button
                className="product-link"
                onClick={() => navigate(`/services/${product.slug}`)}
              >
                Explore Solution
                <span>↗</span>
              </button>
            </div>
          ))}
        </Reveal>

      </div>
    </section>
  );
};

export default Products;
