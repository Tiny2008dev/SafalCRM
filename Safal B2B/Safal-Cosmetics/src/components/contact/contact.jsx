import { useRef, useState } from "react";
import "./Contact.css";
import Reveal from "../Reveal";
import { submitEnquiry as sendEnquiry } from "../../services/api";

const initialForm = { companyName: "", contactPerson: "", email: "", phone: "", productInterest: "", quantity: "", message: "" };

function Contact() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const submissionKey = useRef(crypto.randomUUID());

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      const result = await sendEnquiry({ ...form, quantity: form.quantity || null, idempotencyKey: submissionKey.current });
      setNotice(result.message || "Your enquiry has been received.");
      setForm(initialForm);
      submissionKey.current = crypto.randomUUID();
    } catch (error) {
      setNotice(error.message || "Unable to submit your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <section className="contact-section" id="contact">
      <Reveal className="contact-container">
        <div className="contact-content">
          <div className="contact-label"><span />GET IN TOUCH</div>
          <h2>Let's create<br /><span>something remarkable.</span></h2>
          <p>Have a product idea, fragrance concept or private label requirement? Tell us what you're looking for and our team will get back to you.</p>
          <button className="contact-button" onClick={() => { setNotice(""); setShowForm(true); }}>Send an Enquiry <span>↗</span></button>
        </div>
        <div className="contact-info">
          <div className="contact-info-card"><span className="info-label">WHAT WE WORK WITH</span><div className="info-list"><span>Perfumes</span><span>Air Fresheners</span><span>After Shave Lotion</span><span>Attars</span><span>Sanitizers</span><span>Gift Sets</span></div></div>
          <div className="contact-info-card"><span className="info-label">ENQUIRIES</span><a href="mailto:safalcosmetics@gmail.com" className="email-link">safalcosmetics@gmail.com</a></div>
        </div>
      </Reveal>
      <div className="contact-bottom"><span>PRIVATE LABEL</span><span className="contact-dot" /><span>CONTRACT MANUFACTURING</span><span className="contact-dot" /><span>FRAGRANCE SOLUTIONS</span></div>
    </section>
    {showForm && <div className="form-overlay" onClick={() => !submitting && setShowForm(false)}>
      <div className="form-modal" onClick={(event) => event.stopPropagation()}>
        <div className="form-modal-header"><div><span className="form-small-label">SAFAL COSMETICS</span><h3>Send us an enquiry</h3></div><button className="close-form" onClick={() => setShowForm(false)} aria-label="Close form" disabled={submitting}>×</button></div>
        <form className="google-form-container" onSubmit={handleSubmit}>
          {[["companyName", "Company name", "text"], ["contactPerson", "Contact person", "text"], ["email", "Business email", "email"], ["phone", "Phone (optional)", "tel"], ["productInterest", "Product interest", "text"], ["quantity", "Approximate quantity", "number"]].map(([name, label, type]) => <label key={name} style={{ display: "block", marginBottom: 10 }}>{label}{name !== "phone" && " *"}<input required={name !== "phone"} type={type} min={type === "number" ? 1 : undefined} maxLength={type === "number" ? undefined : 254} value={form[name]} disabled={submitting} onChange={(event) => { submissionKey.current = crypto.randomUUID(); setForm({ ...form, [name]: event.target.value }); }} style={{ display: "block", width: "100%", padding: 10 }} /></label>)}
          <label style={{ display: "block", marginBottom: 10 }}>Message *<textarea required maxLength={3000} rows={4} value={form.message} disabled={submitting} onChange={(event) => { submissionKey.current = crypto.randomUUID(); setForm({ ...form, message: event.target.value }); }} style={{ display: "block", width: "100%", padding: 10 }} /></label>
          {notice && <p role="status" aria-live="polite">{notice}</p>}
          <button type="submit" className="contact-button" disabled={submitting}>{submitting ? "Sending…" : "Submit Enquiry"}</button>
        </form>
      </div>
    </div>}
  </>;
}

export default Contact;
