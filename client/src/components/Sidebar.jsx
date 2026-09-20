import "../App.css";

const sidebarItems = [
  "Dashboard",
  "Clients",
  "Materials",
  "Products",
  "BOM",
  "Production",
  "Orders",
  "Reports",
];

function Sidebar({ activePage, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">S</div>
        <div>
          <h1>Safal CRM</h1>
          <p>Perfume Manufacturing</p>
        </div>
      </div>
      <nav className="menu-list">
        {sidebarItems.map((item) => (
          <button
            key={item}
            className={`menu-item ${activePage === item ? "active" : ""}`}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>Business CRM for perfume makers</p>
      </div>
    </aside>
  );
}

export default Sidebar;
