import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { api, money } from "../api";
import { useAuth } from "../auth";
import { Alert, Button, Card, Empty, Field, Loading, PageHeader, Stat, Table, Td, Th } from "../ui";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

export default function Reports() {
  const { user } = useAuth();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [salesmanId, setSalesmanId] = useState("");
  const [productId, setProductId] = useState("");
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setError("");
    setBusy(true);
    try {
      const qs = new URLSearchParams({ from, to, salesmanId, productId });
      for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
      setData(await api(`/api/reports/sales?${qs}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    run();
    api("/api/products").then((r) => setProducts(r.data)).catch(() => {});
    if (user!.role === "ADMINISTRATOR") api("/api/salesmen").then((r) => setSalesmen(r.data)).catch(() => {});
  }, []);

  const select = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader title="Sales reports" subtitle="Filter completed sales by date, salesman or product">
        <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
          <Printer size={16} /> Print
        </Button>
      </PageHeader>

      <Card className="print:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <Field label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {user!.role === "ADMINISTRATOR" && (
            <label className="block text-sm font-medium text-slate-700">
              Salesman
              <select className={select} value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)}>
                <option value="">All salesmen</option>
                {salesmen.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Product
            <select className={select} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.productName}</option>
              ))}
            </select>
          </label>
          <Button disabled={busy}>{busy ? "Loading..." : "Run report"}</Button>
        </form>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total sales" value={money(data.summary.totalSales)} />
            <Stat label="Number of sales" value={data.summary.salesCount} />
            <Stat label="Items sold" value={data.summary.totalQuantity} />
          </div>

          <div>
            <h2 className="mb-2 font-semibold">Quantity sold by product</h2>
            <Table>
              <thead>
                <tr><Th>Product</Th><Th right>Quantity</Th><Th right>Revenue</Th></tr>
              </thead>
              <tbody>
                {data.byProduct.map((p: any) => (
                  <tr key={p.productId}>
                    <Td className="font-medium">{p.productName}</Td>
                    <Td right>{p.quantity}</Td>
                    <Td right>{money(p.revenue)}</Td>
                  </tr>
                ))}
                {data.byProduct.length === 0 && <tr><td colSpan={3}><Empty>No sales match these filters.</Empty></td></tr>}
              </tbody>
            </Table>
          </div>

          <div>
            <h2 className="mb-2 font-semibold">Sales</h2>
            <Table>
              <thead>
                <tr><Th>Receipt</Th><Th>Date</Th><Th>Salesman</Th><Th>Payment</Th><Th right>Items</Th><Th right>Total</Th></tr>
              </thead>
              <tbody>
                {data.sales.map((s: any) => (
                  <tr key={s.id}>
                    <Td className="font-medium">{s.receiptNumber}</Td>
                    <Td>{new Date(s.saleDate).toLocaleString()}</Td>
                    <Td>{s.salesman.fullName}</Td>
                    <Td>{s.paymentMethod}</Td>
                    <Td right>{s.itemCount}</Td>
                    <Td right>{money(s.totalAmount)}</Td>
                  </tr>
                ))}
                {data.sales.length === 0 && <tr><td colSpan={6}><Empty>No sales match these filters.</Empty></td></tr>}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}