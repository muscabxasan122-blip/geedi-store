import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Printer, Search, Trash2 } from "lucide-react";
import { api, money } from "../api";
import { useAuth } from "../auth";
import { Alert, Button, Card, Empty, Loading, PageHeader } from "../ui";

type Product = { id: number; productCode: string; productName: string; category: string; sellingPrice: string; quantityInStock: number };
type Line = { productId: number; name: string; price: number; qty: number; stock: number };

const METHODS = ["CASH", "EVC", "E-DAHAB"];

export default function NewSale() {
  const { user } = useAuth();
  const isAdmin = user!.role === "ADMINISTRATOR";
  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  async function loadProducts() {
    try {
      const r = await api("/api/products");
      setProducts(r.data.filter((p: any) => p.status === "ACTIVE"));
    } catch (e: any) {
      setError(e.message);
      setProducts([]);
    }
  }
  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set((products ?? []).map((p) => p.category))).sort()], [products]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (products ?? []).filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (!t || p.productName.toLowerCase().includes(t) || p.productCode.toLowerCase().includes(t))
    );
  }, [products, q, cat]);

  function add(p: Product) {
    setError("");
    setCart((c) => {
      const line = c.find((l) => l.productId === p.id);
      if (line) return c.map((l) => (l.productId === p.id ? { ...l, qty: Math.min(l.qty + 1, l.stock) } : l));
      return [...c, { productId: p.id, name: p.productName, price: Number(p.sellingPrice), qty: 1, stock: p.quantityInStock }];
    });
  }

  const change = (id: number, delta: number) =>
    setCart((c) =>
      c.map((l) => (l.productId === id ? { ...l, qty: Math.max(1, Math.min(l.qty + delta, l.stock)) } : l))
    );

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const disc = isAdmin ? Number(discount) || 0 : 0;
  const total = Math.max(0, subtotal - disc);

  async function submit() {
    setError("");
    if (cart.length === 0) return setError("Add at least one item");
    setBusy(true);
    try {
      const r = await api("/api/sales", {
        method: "POST",
        body: { items: cart.map((l) => ({ productId: l.productId, quantity: l.qty })), discount: disc, paymentMethod: method },
      });
      setReceipt(r.data);
    } catch (e: any) {
      setError(e.message);
      loadProducts();
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setReceipt(null);
    setCart([]);
    setDiscount("0");
    setMethod("CASH");
    setError("");
    loadProducts();
  }

  if (receipt) {
    return (
      <div className="space-y-5">
        <Card className="mx-auto max-w-sm !p-6 print:border-0 print:shadow-none">
          <h2 className="text-center text-xl font-bold">Geedi Store</h2>
          <p className="text-center text-sm text-slate-500">Receipt {receipt.receiptNumber}</p>
          <div className="mt-4 space-y-0.5 text-sm text-slate-600">
            <p>Date: {new Date(receipt.saleDate).toLocaleString()}</p>
            <p>Cashier: {receipt.salesman.fullName}</p>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-400">
                <th className="py-1.5">Item</th><th>Qty</th><th>Price</th><th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((i: any) => (
                <tr key={i.id}>
                  <td className="py-1.5">{i.productName}</td>
                  <td>{i.quantity}</td>
                  <td>{money(i.unitPrice)}</td>
                  <td className="text-right">{money(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1 border-t border-dashed pt-3 text-sm">
            <p className="flex justify-between"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></p>
            <p className="flex justify-between"><span>Discount</span><span>{money(receipt.discount)}</span></p>
            <p className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(receipt.totalAmount)}</span></p>
            <p className="flex justify-between text-slate-500"><span>Paid by</span><span>{receipt.paymentMethod}</span></p>
          </div>
          <p className="mt-5 text-center text-xs text-slate-400">Thank you for shopping with us</p>
        </Card>
        <div className="flex justify-center gap-3 print:hidden">
          <Button onClick={() => window.print()}><Printer size={16} /> Print receipt</Button>
          <Button variant="secondary" onClick={reset}>New sale</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New sale" subtitle="Tap a product to add it to the cart" />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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

          {!products ? (
            <Loading />
          ) : shown.length === 0 ? (
            <Card><Empty>No products found.</Empty></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((p) => {
                const out = p.quantityInStock <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={out}
                    onClick={() => add(p)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <p className="text-xs text-slate-400">{p.productCode} · {p.category}</p>
                    <p className="mt-0.5 font-semibold leading-snug">{p.productName}</p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-lg font-bold">{money(p.sellingPrice)}</span>
                      <span className={`text-xs ${out ? "text-red-600" : "text-slate-500"}`}>
                        {out ? "Out of stock" : `${p.quantityInStock} available`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit space-y-4 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Cart</h2>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Your cart is empty</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cart.map((l) => (
                <li key={l.productId} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{l.name}</span>
                    <button onClick={() => setCart((c) => c.filter((x) => x.productId !== l.productId))} className="text-slate-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => change(l.productId, -1)} className="rounded border border-slate-300 p-1 hover:bg-slate-50"><Minus size={14} /></button>
                      <span className="w-6 text-center font-medium">{l.qty}</span>
                      <button onClick={() => change(l.productId, 1)} disabled={l.qty >= l.stock} className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40"><Plus size={14} /></button>
                      <span className="text-xs text-slate-400">× {money(l.price)}</span>
                    </div>
                    <span className="font-semibold">{money(l.price * l.qty)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
            <p className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></p>
            {isAdmin && (
              <label className="flex items-center justify-between text-slate-600">
                Discount
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </label>
            )}
            <p className="flex justify-between text-xl font-bold"><span>Total</span><span>{money(total)}</span></p>
            <label className="flex items-center justify-between text-slate-600">
              Payment method
              <select className="rounded-lg border border-slate-300 px-2 py-1.5" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          <Button onClick={submit} disabled={busy || cart.length === 0} className="w-full py-2.5">
            {busy ? "Saving..." : `Complete sale · ${money(total)}`}
          </Button>
        </Card>
      </div>
    </div>
  );
}