import "../App.css";

function PageIntro({ eyebrow, title, description }) {
  return (
    <header className="page-header dashboard-hero">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </header>
  );
}

export default PageIntro;