import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { Layout } from "./components/Layout";
import BankInvoices from "./pages/BankInvoices";
import Banks from "./pages/Banks";
import ClientIntake from "./pages/ClientIntake";
import CustomerForm from "./pages/CustomerForm";
import CustomerHub from "./pages/CustomerHub";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import { Receipts, Vouchers } from "./pages/Payments";
import PublicInvoice from "./pages/PublicInvoice";
import { DayBook, Yearly } from "./pages/Reports";
import Settings from "./pages/Settings";

function KeepSearch({ to }: { to: string }) {
  return <Navigate to={to + useLocation().search} replace />;
}
function OldDetail() {
  return <Navigate to={`/customers/${useParams().id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Client Intake Form (No admin sidebar/nav) */}
      <Route path="/apply" element={<ClientIntake />} />

      {/* Public Client Invoice Viewer with e-Sign & PDF download */}
      <Route path="/view-invoice/:id" element={<PublicInvoice />} />

      {/* Internal Management Portal */}
      <Route
        path="/*"
        element={
          <AuthGate>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/new/individual" element={<CustomerForm key="i" company={false} />} />
              <Route path="/customers/new/company" element={<CustomerForm key="c" company />} />
              <Route path="/customers/:id" element={<CustomerHub />} />
              {/* old per-sheet customer URLs */}
              <Route path="/customer-codes" element={<KeepSearch to="/customers" />} />
              <Route path="/customer-sheet" element={<Navigate to="/customers?type=Salaried" replace />} />
              <Route path="/self-employed" element={<Navigate to="/customers?type=Self%20Employed" replace />} />
              <Route path="/customer-sheet/new" element={<Navigate to="/customers/new/individual" replace />} />
              <Route path="/self-employed/new" element={<Navigate to="/customers/new/company" replace />} />
              <Route path="/customer-sheet/:id" element={<OldDetail />} />
              <Route path="/self-employed/:id" element={<OldDetail />} />
              <Route path="/invoice" element={<Invoices />} />
              <Route path="/bank-invoice" element={<BankInvoices />} />
              <Route path="/banks" element={<Banks />} />
              <Route path="/receipt" element={<Receipts />} />
              <Route path="/voucher" element={<Vouchers />} />
              <Route path="/day-book" element={<DayBook />} />
              <Route path="/yearly-report" element={<Yearly />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
          </AuthGate>
        }
      />
    </Routes>
  );
}
