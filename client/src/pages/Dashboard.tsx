import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../auth";
import { Alert, Badge, Card, Empty, Loading, PageHeader, Stat } from "../ui";

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/dashboard").then((r) => setD(r.data)).catch((e) => setError(e.message));
  }, []);

  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const first = user!.fullName.split(" ")[0];
  const role = user!.role;

  const actions = [
    { to: "/sales/new", label: "New sale", show: role !== "INVENTORY_MANAGER" },
    { to: "/products", label: role === "SALESMAN" ? "Browse stock" : "Manage stock", show: true },
    { to: "/reports", label: "View reports", show: role !== "SALESMAN" },
  ].filter((a) => a.show);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!d) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting}, ${first}`} subtitle="Here's how the store is doing today" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Today's sales" value={money(d.todaySales)} />
        <Stat label="Sales made today" value={d.todaySalesCount} />
        {d.productsInStock !== undefined && <Stat label="Products in stock" value={d.productsInStock} />}
      </div>

      <div className="flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            {a.label}
          </Link>
        ))}
      </div>

      {d.lowStockProducts && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-semibold">Low-stock products</h2>
            <Badge tone={d.lowStockProducts.length ? "amber" : "green"}>{d.lowStockProducts.length}</Badge>
          </div>
          {d.lowStockProducts.length === 0 ? (
            <Empty>Every product is above its reorder level.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {d.lowStockProducts.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="font-medium">{p.productName}</span>
                    <span className="ml-2 text-xs text-slate-400">{p.productCode}</span>
                  </span>
                  <span className="text-red-600">{p.quantityInStock} left · reorder at {p.reorderLevel}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}