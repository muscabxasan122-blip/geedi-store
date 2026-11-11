import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout";
import RequireRole from "./RequireRole";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NewSale from "./pages/NewSale";
import Salesmen from "./pages/Salesmen";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route
          path="/sales/new"
          element={
            <RequireRole roles={["ADMINISTRATOR", "SALESMAN"]}>
              <NewSale />
            </RequireRole>
          }
        />
        <Route
          path="/salesmen"
          element={
            <RequireRole roles={["ADMINISTRATOR"]}>
              <Salesmen />
            </RequireRole>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireRole roles={["ADMINISTRATOR", "INVENTORY_MANAGER"]}>
              <Reports />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}