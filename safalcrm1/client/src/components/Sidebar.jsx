import "../App.css";

const sidebarItems = [
  "Dashboard",
  "Clients",
  "Materials",
  "Products",
  "BOM",
  "Production",
  "Orders",
  "Records",
  "Enquiries",
  "Reports",
];

function Sidebar({ activePage, onSelect, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <img className="brand-mark" src={`${process.env.PUBLIC_URL}/Safallogo.png`} alt="Safal Marg" />
        <div>
          <h1>Safal Cosmetics</h1>
        </div>
      </div>
      <nav className="menu-list" aria-label="Main navigation">
        {sidebarItems.map((item) => (
          <button
            key={item}
            className={`menu-item ${activePage === item ? "active" : ""}`}
            aria-current={activePage === item ? "page" : undefined}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>Safal Cosmetics</p>
        <button type="button" className="menu-item sidebar-logout" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
