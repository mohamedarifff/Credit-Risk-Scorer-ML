import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-white/10 text-white"
      : "text-slate-400 hover:bg-white/5 hover:text-white"
  }`;

const links = [
  { to: "/advisor", label: "Advisor", end: true },
  { to: "/profile", label: "Profile", end: false },
  { to: "/eligibility", label: "Eligibility", end: false },
  { to: "/opportunities", label: "Opportunities", end: false },
  { to: "/assess", label: "Assess", end: false },
] as const;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-panel/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">
                Personal <span className="text-accent">Financial Advisor</span>
              </p>
              <p className="text-xs text-slate-500">
                Credit risk · eligibility · roadmap
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-1">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-400 sm:inline">
                {user?.username}
              </span>
              <button type="button" onClick={handleLogout} className="btn-ghost">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
