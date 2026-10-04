import "../App.css";

function PageIntro({ eyebrow, title, description }) {
  return (
    <header className="page-header dashboard-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

export default PageIntro;