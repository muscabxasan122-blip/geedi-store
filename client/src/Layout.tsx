import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, LayoutDashboard, LogOut, Package, ShoppingCart, Store, Users } from "lucide-react";
import { useAuth, type Role } from "./auth";

const links: { to: string; label: string; icon: any; roles: Role[] }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMINISTRATOR", "SALESMAN", "INVENTORY_MANAGER"] },
  { to: "/products", label: "Products", icon: Package, roles: ["ADMINISTRATOR", "SALESMAN", "INVENTORY_MANAGER"] },
  { to: "/sales/new", label: "New Sale", icon: ShoppingCart, roles: ["ADMINISTRATOR", "SALESMAN"] },
  { to: "/salesmen", label: "Salesmen", icon: Users, roles: ["ADMINISTRATOR"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMINISTRATOR", "INVENTORY_MANAGER"] },
];

const roleLabel: Record<Role, string> = {
  ADMINISTRATOR: "Administrator",
  SALESMAN: "Salesman",
  INVENTORY_MANAGER: "Inventory manager",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;

  const visible = links.filter((l) => l.roles.includes(user.role));
  const initials = user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-4 text-slate-200 md:flex print:hidden">
        <div className="mb-8 flex items-center gap-2 px-2 text-white">
          <span className="rounded-lg bg-emerald-600 p-1.5"><Store size={20} /></span>
          <span className="text-lg font-bold">Geedi Store</span>
        </div>
        <nav className="flex-1 space-y-1">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-emerald-600 text-white" : "hover:bg-slate-800"
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-slate-700 pt-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
              <p className="text-xs text-slate-400">{roleLabel[user.role]}</p>
            </div>
          </div>
          <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-800">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (mobile) */}
        <header className="bg-slate-900 text-white md:hidden print:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 font-bold"><Store size={18} /> Geedi Store</span>
            <button onClick={doLogout} className="text-sm text-slate-300">Logout</button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {visible.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-emerald-600" : "bg-slate-800"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}