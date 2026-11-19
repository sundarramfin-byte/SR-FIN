import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import BankInvoices from "./pages/BankInvoices";
import Banks from "./pages/Banks";
import ClientIntake from "./pages/ClientIntake";
import CustomerForm from "./pages/CustomerForm";
import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import { Receipts, Vouchers } from "./pages/Payments";
import PublicInvoice from "./pages/PublicInvoice";
import { DayBook, Yearly } from "./pages/Reports";
import Settings from "./pages/Settings";

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
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customer-codes" element={<Customers kind="all" title="Customer Code List" />} />
              <Route path="/customer-sheet" element={<Customers kind="individual" title="Customer Data Sheet (Salaried / NRI)" />} />
              <Route path="/customer-sheet/:id" element={<CustomerForm key="i" company={false} />} />
              <Route path="/self-employed" element={<Customers kind="company" title="Self Employed" />} />
              <Route path="/self-employed/:id" element={<CustomerForm key="c" company />} />
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
        }
      />
    </Routes>
  );
}
