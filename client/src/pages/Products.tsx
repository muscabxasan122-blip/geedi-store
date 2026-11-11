import { useEffect, useMemo, useState } from "react";
import { PackagePlus, Pencil, Plus, Power, Search } from "lucide-react";
import { api, money } from "../api";
import { useAuth } from "../auth";
import { Alert, Badge, Button, Card, Empty, Field, Loading, PageHeader } from "../ui";

type Product = {
  id: number;
  productCode: string;
  productName: string;
  category: string;
  costPrice?: string;
  sellingPrice: string;
  quantityInStock: number;
  reorderLevel: number;
  status: "ACTIVE" | "INACTIVE";
  lowStock: boolean;
};

const empty = { productCode: "", productName: "", category: "", costPrice: "", sellingPrice: "", quantityInStock: "0", reorderLevel: "0" };

function stockInfo(p: Product) {
  if (p.status === "INACTIVE") return { tone: "slate" as const, label: "Inactive", bar: "bg-slate-300" };
  if (p.quantityInStock <= 0) return { tone: "red" as const, label: "Out of stock", bar: "bg-red-500" };
  if (p.lowStock) return { tone: "amber" as const, label: "Low stock", bar: "bg-amber-500" };
  return { tone: "green" as const, label: "In stock", bar: "bg-emerald-500" };
}

export default function Products() {
  const { user } = useAuth();
  const canManage = user!.role !== "SALESMAN";
  const [items, setItems] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [receiveQty, setReceiveQty] = useState("");

  async function load() {
    try {
      const r = await api("/api/products");
      setItems(r.data);
    } catch (e: any) {
      setError(e.message);
      setItems([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set((items ?? []).map((p) => p.category))).sort()], [items]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (!t || p.productName.toLowerCase().includes(t) || p.productCode.toLowerCase().includes(t))
    );
  }, [items, q, cat]);

  function startNew() {
    setEditId(null);
    setForm(empty);
    setShowForm(true);
    setError("");
    setMsg("");
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({
      productCode: p.productCode,
      productName: p.productName,
      category: p.category,
      costPrice: String(Number(p.costPrice ?? 0)),
      sellingPrice: String(Number(p.sellingPrice)),
      quantityInStock: String(p.quantityInStock),
      reorderLevel: String(p.reorderLevel),
    });
    setShowForm(true);
    setError("");
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const body = {
      productCode: form.productCode,
      productName: form.productName,
      category: form.category,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      quantityInStock: Number(form.quantityInStock),
      reorderLevel: Number(form.reorderLevel),
    };
    try {
      if (editId) await api(`/api/products/${editId}`, { method: "PUT", body });
      else await api("/api/products", { method: "POST", body });
      setMsg(editId ? "Product updated" : "Product added");
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function receive(p: Product) {
    setError("");
    setMsg("");
    try {
      await api("/api/stock/in", { method: "POST", body: { productId: p.id, quantity: Number(receiveQty) } });
      setMsg(`Added ${receiveQty} to ${p.productName}`);
      setReceivingId(null);
      setReceiveQty("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function toggle(p: Product) {
    setError("");
    try {
      await api(`/api/products/${p.id}/${p.status === "ACTIVE" ? "deactivate" : "activate"}`, { method: "PATCH" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const f = (label: string, key: keyof typeof empty, type = "text", disabled = false) => (
    <Field label={label} type={type} disabled={disabled} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle={canManage ? "Manage your stock and prices" : "See what's available in the store"}>
        {canManage && (
          <Button onClick={startNew}>
            <Plus size={16} /> Add product
          </Button>
        )}
      </PageHeader>

      {error && <Alert tone="error">{error}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}

      {showForm && (
        <Card>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
            {f("Product code", "productCode")}
            {f("Name", "productName")}
            {f("Category", "category")}
            {f("Cost price", "costPrice", "number")}
            {f("Selling price", "sellingPrice", "number")}
            {f(editId ? "Quantity (use Receive stock)" : "Opening quantity", "quantityInStock", "number", !!editId)}
            {f("Reorder level", "reorderLevel", "number")}
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button>{editId ? "Save changes" : "Add product"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Search by product name or code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                cat === c ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {!items ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Card><Empty>No products match your search.</Empty></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
            const s = stockInfo(p);
            const pct = Math.min(100, Math.round((p.quantityInStock / Math.max(p.reorderLevel * 3, 1)) * 100));
            return (
              <Card key={p.id} className={`flex flex-col ${p.status === "INACTIVE" ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{p.productCode} · {p.category}</p>
                    <h3 className="font-semibold leading-snug">{p.productName}</h3>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>

                <p className="mt-3 text-2xl font-bold tracking-tight">{money(p.sellingPrice)}</p>
                {canManage && <p className="text-xs text-slate-400">Cost {money(p.costPrice)}</p>}

                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {p.quantityInStock} in stock{canManage ? ` · reorder at ${p.reorderLevel}` : ""}
                  </p>
                </div>

                {canManage && (
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {receivingId === p.id ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          autoFocus
                          placeholder="Quantity received"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                          value={receiveQty}
                          onChange={(e) => setReceiveQty(e.target.value)}
                        />
                        <Button onClick={() => receive(p)}>Add</Button>
                        <Button variant="ghost" onClick={() => setReceivingId(null)}>✕</Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => startEdit(p)}><Pencil size={14} /> Edit</Button>
                        <Button variant="secondary" onClick={() => { setReceivingId(p.id); setReceiveQty(""); }}>
                          <PackagePlus size={14} /> Receive stock
                        </Button>
                        <Button variant="ghost" onClick={() => toggle(p)} className={p.status === "ACTIVE" ? "text-red-600" : "text-emerald-700"}>
                          <Power size={14} /> {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}