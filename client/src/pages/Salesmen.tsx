import { useEffect, useState } from "react";
import { api, money } from "../api";
import { Alert, Badge, Button, Card, Empty, Field, Loading, PageHeader, Table, Td, Th } from "../ui";

type Salesman = {
  id: number;
  fullName: string;
  username: string;
  status: "ACTIVE" | "SUSPENDED";
  salesCount: number;
  totalSales: number;
};

export default function Salesmen() {
  const [list, setList] = useState<Salesman[] | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", password: "" });
  const [viewing, setViewing] = useState<{ name: string; sales: any[]; total: number } | null>(null);

  async function load() {
    try {
      const r = await api("/api/salesmen");
      setList(r.data);
    } catch (e: any) {
      setError(e.message);
      setList([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await api("/api/salesmen", { method: "POST", body: form });
      setMsg(`Salesman "${form.fullName}" created`);
      setForm({ fullName: "", username: "", password: "" });
      setShow(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function setStatus(s: Salesman) {
    setError("");
    setMsg("");
    const status = s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await api(`/api/salesmen/${s.id}/status`, { method: "PATCH", body: { status } });
      setMsg(`${s.fullName} is now ${status.toLowerCase()}`);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function view(s: Salesman) {
    try {
      const r = await api(`/api/salesmen/${s.id}/sales`);
      setViewing({ name: s.fullName, sales: r.data, total: r.totalSales });
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Salesmen" subtitle="Create accounts, suspend access and review recorded sales">
        <Button onClick={() => setShow(!show)}>{show ? "Close" : "+ Add salesman"}</Button>
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}

      {show && (
        <Card>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-4 sm:items-end">
            <Field label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Field label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Field label="Password (min 6)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button>Save salesman</Button>
          </form>
        </Card>
      )}

      {!list ? (
        <Loading />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Username</Th>
              <Th>Status</Th>
              <Th right>Sales</Th>
              <Th right>Total</Th>
              <Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{s.fullName}</Td>
                <Td>{s.username}</Td>
                <Td>
                  <Badge tone={s.status === "ACTIVE" ? "green" : "red"}>{s.status === "ACTIVE" ? "Active" : "Suspended"}</Badge>
                </Td>
                <Td right>{s.salesCount}</Td>
                <Td right>{money(s.totalSales)}</Td>
                <Td right>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => view(s)}>View sales</Button>
                    <Button variant={s.status === "ACTIVE" ? "danger" : "primary"} onClick={() => setStatus(s)}>
                      {s.status === "ACTIVE" ? "Suspend" : "Activate"}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6}><Empty>No salesmen yet.</Empty></td></tr>
            )}
          </tbody>
        </Table>
      )}

      {viewing && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Sales by {viewing.name} (total {money(viewing.total)})</h2>
            <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
          </div>
          {viewing.sales.length === 0 ? (
            <Empty>No sales recorded yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr><Th>Receipt</Th><Th>Date</Th><Th>Payment</Th><Th>Status</Th><Th right>Total</Th></tr>
              </thead>
              <tbody>
                {viewing.sales.map((s: any) => (
                  <tr key={s.id}>
                    <Td className="font-medium">{s.receiptNumber}</Td>
                    <Td>{new Date(s.saleDate).toLocaleString()}</Td>
                    <Td>{s.paymentMethod}</Td>
                    <Td><Badge tone={s.status === "COMPLETED" ? "green" : "red"}>{s.status}</Badge></Td>
                    <Td right>{money(s.totalAmount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}