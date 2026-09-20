import "../App.css";

function Header({ title, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
      </div>
      <button type="button" className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </header>
  );
}

export default Header;
