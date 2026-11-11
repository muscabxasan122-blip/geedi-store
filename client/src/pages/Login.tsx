import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Store } from "lucide-react";
import { useAuth } from "../auth";
import { Alert, Button, Field } from "../ui";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) return setError("Username and password are required");
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-emerald-600 to-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-xl font-bold">
          <span className="rounded-lg bg-white/15 p-2"><Store size={22} /></span> Geedi Store
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Sell faster.<br />Know your stock.</h2>
          <p className="mt-4 max-w-sm text-emerald-100">
            Inventory, sales and receipts in one place, with every record safely stored.
          </p>
        </div>
        <p className="text-sm text-emerald-100/70">Sales Management System</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your Geedi Store account</p>
          </div>
          <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {error && <Alert tone="error">{error}</Alert>}
          <Button disabled={busy} className="w-full py-2.5">{busy ? "Signing in..." : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}