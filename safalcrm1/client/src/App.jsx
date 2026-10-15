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
  const [editRecord, setEditRecord] = useState(null);
  const requestEdit = useCallback((page, record) => {
    setEditRecord({ type: page, value: record });
    setActivePage(page);
  }, []);
  const consumeEditRecord = useCallback(() => setEditRecord(null), []);

  if (!authenticated) {
    return <LoginPage onLogin={(user) => { setAuthToken(user.token); setUserRole(user.role); setAuthenticated(true); }} />;
  }

  const ActivePage = pages[activePage] || DashboardPage;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onSelect={(page) => { setEditRecord(null); setActivePage(page); }}
        onLogout={() => {
          setAuthToken(null);
          setUserRole(null);
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
