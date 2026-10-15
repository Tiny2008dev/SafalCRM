import "./brand.css";
import Reveal from "../Reveal";

import souledStore from "../../Safal_brand_logos_PNG/01_The_Souled_Store.png";
import aureme from "../../Safal_brand_logos_PNG/02_Aureme.png";
import tfc from "../../Safal_brand_logos_PNG/03_TFC_The_Fragrance_Club.png";
import one8 from "../../Safal_brand_logos_PNG/04_one8.png";
import orgasmic from "../../Safal_brand_logos_PNG/05_Orgasmic.png";
import theClass from "../../Safal_brand_logos_PNG/06_The_Class.png";
import jayWalking from "../../Safal_brand_logos_PNG/07_Jay_Walking.png";
import vittario from "../../Safal_brand_logos_PNG/08_Vittario_Milano.png";
import laHarem from "../../Safal_brand_logos_PNG/09_La_Harem.png";
import swissScents from "../../Safal_brand_logos_PNG/10_Swiss_Scents.png";

function Brands() {
  const brands = [
    {
      name: "The Souled Store",
      image: souledStore,
    },
    {
      name: "Aureme",
      image: aureme,
    },
    {
      name: "The Fragrance Club",
      image: tfc,
    },
    {
      name: "one8",
      image: one8,
    },
    {
      name: "Orgasmic",
      image: orgasmic,
    },
    {
      name: "The Class",
      image: theClass,
    },
    {
      name: "Jay Walking",
      image: jayWalking,
    },
    {
      name: "Vittario Milano",
      image: vittario,
    },
    {
      name: "La Harem",
      image: laHarem,
    },
    {
      name: "Swiss Scents",
      image: swissScents,
    },
  ];

  /*
    Duplicate the brands so the marquee can
    continuously loop without a visible jump.
  */
  const marqueeBrands = [...brands, ...brands];

  return (
    <section className="brands-section" id="clients">

      {/* Section Header */}
      <Reveal className="brands-header">

        

        <div className="brands-heading-row">

          <h2>
            Brands made
            <br />
            <span>at our premise.</span>
          </h2>

          <p>
            From emerging labels to established names,
            we work behind the scenes to bring distinctive
            fragrance products to life.
          </p>

        </div>

      </Reveal>


      {/* Top decorative line */}
      <div className="brands-line">
        <span></span>
      </div>


      {/* Marquee */}
      <Reveal className="brands-marquee-wrapper" delay={150}>

        <div className="brands-marquee">

          {marqueeBrands.map((brand, index) => (
            <div
              className="brand-item"
              key={`${brand.name}-${index}`}
            >

              <div className="brand-circle">

                <img
                  src={brand.image}
                  alt={brand.name}
                />

              </div>

              <span className="brand-name">
                {brand.name}
              </span>

            </div>
          ))}

        </div>

      </Reveal>


      {/* Bottom information */}
      <div className="brands-footer">

        <span>PRIVATE LABEL</span>

        <span className="footer-dot"></span>

        <span>CONTRACT MANUFACTURING</span>

        <span className="footer-dot"></span>

        <span>FRAGRANCE SOLUTIONS</span>

      </div>

    </section>
  );
}

export default Brands;
