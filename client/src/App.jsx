import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ClientsPage from "./pages/Clients";
import MaterialsPage from "./pages/Materials";
import ProductsPage from "./pages/Products";
import BOMPage from "./pages/BOM";
import ProductionPage from "./pages/Production";
import OrdersPage from "./pages/Orders";
import ReportsPage from "./pages/Reports";
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
};

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  const ActivePage = pages[activePage] || DashboardPage;

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onSelect={setActivePage} />
      <div className="app-content">
        <Header title={activePage} onLogout={() => setAuthenticated(false)} />
        <main className="page-container">
          <ActivePage />
        </main>
      </div>
    </div>
  );
}

export default App;
