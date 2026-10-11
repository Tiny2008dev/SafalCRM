import { useCallback, useState } from "react";
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
};

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [editRecord, setEditRecord] = useState(null);
  const requestEdit = useCallback((page, record) => {
    setEditRecord({ type: page, value: record });
    setActivePage(page);
  }, []);
  const consumeEditRecord = useCallback(() => setEditRecord(null), []);

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  const ActivePage = pages[activePage] || DashboardPage;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onSelect={(page) => { setEditRecord(null); setActivePage(page); }}
        onLogout={() => {
          setEditRecord(null);
          setActivePage("Dashboard");
          setAuthenticated(false);
        }}
      />
      <div className="app-content">
        <main className="page-container">
          <div className="page-view dashboard-page">
            <ActivePage
              onNavigate={setActivePage}
              onEditRequest={requestEdit}
              editRecord={editRecord}
              onEditConsumed={consumeEditRecord}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
