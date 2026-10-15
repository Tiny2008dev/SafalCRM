
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import About from "./components/About/About";
import Brand from "./components/brands/brand";
import Products from "./components/Products/Products";
import Contact from "./components/contact/contact";
import Footer from "./components/Footer/Footer";
import ServicePage from "./components/ServicePage/ServicePage";
import ScrollToTop from "./components/ScrollToTop";
import OwnerContact from "./components/OwnerContact/OwnerContact";

function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Navbar />

      <main id="main-content">
        <Hero />
        <About />
        <Brand />
        <Products />
        <Contact />
      </main>

      <Footer />

      {/* Floating Owner Contact Widget */}
      <OwnerContact />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/services/:serviceId"
          element={
            <>
              <Navbar />
              <ServicePage />
              <Footer />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;