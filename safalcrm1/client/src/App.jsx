import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ClientsPage from "./pages/Clients";
import MaterialsPage from "./pages/Materials";
import ProductsPage from "./pages/Products";
import BOMPage from "./pages/BOM";
import ProductionPage from "./pages/Production";
import OrdersPage from "./pages/Orders";
import ReportsPage from "./pages/Reports";
import AdminListsPage from "./pages/Lists";
import EnquiriesPage from "./pages/Enquiries";
import { setAuthToken } from "./services/api";
import "./App.css";

const pages = {
  Dashboard: DashboardPage,
  Clients: ClientsPage,
  Materials: MaterialsPage,
  Products: ProductsPage,
  BOM: BOMPage,
  Production: ProductionPage,
  Orders: OrdersPage,
  Reports: ReportsPage,
  Records: AdminListsPage,
  Enquiries: EnquiriesPage,
};

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const requestEdit = useCallback((page, record) => {
    setEditRecord({ type: page, value: record });
    setActivePage(page);
  }, []);
  const consumeEditRecord = useCallback(() => setEditRecord(null), []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  if (!authenticated) {
    return <LoginPage onLogin={(user) => { setAuthToken(user.token); setUserRole(user.role); setAuthenticated(true); }} />;
  }

  const ActivePage = pages[activePage] || DashboardPage;

  return (
    <div className={`app-shell${mobileMenuOpen ? " mobile-menu-open" : ""}`}>
      <button
        type="button"
        className="mobile-menu-backdrop"
        aria-label="Close navigation menu"
        tabIndex={mobileMenuOpen ? 0 : -1}
        onClick={() => setMobileMenuOpen(false)}
      />
      <Sidebar
        activePage={activePage}
        mobileOpen={mobileMenuOpen}
        onSelect={(page) => { setEditRecord(null); setActivePage(page); setMobileMenuOpen(false); }}
        onLogout={() => {
          setAuthToken(null);
          setUserRole(null);
          setEditRecord(null);
          setActivePage("Dashboard");
          setAuthenticated(false);
        }}
      />
      <div className="app-content">
        <header className="mobile-topbar">
          <span className="mobile-topbar-title">{activePage}</span>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="crm-main-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
          </button>
        </header>
        <main className="page-container">
          <div className="page-view dashboard-page">
            <ActivePage
              onNavigate={setActivePage}
              onEditRequest={requestEdit}
              editRecord={editRecord}
              userRole={userRole}
              onEditConsumed={consumeEditRecord}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
