import { BookOpen, LayoutDashboard, ShieldCheck } from "lucide-react";

const tabs = [
  { id: "workspace", label: "Workspace", Icon: LayoutDashboard },
  { id: "documentation", label: "Documentation", Icon: BookOpen },
];

export default function Navbar({ activeView, onChange }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#0b1120]/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2.5">
        <div className="rounded-lg bg-cyan-400/10 p-1.5 text-cyan-300">
          <ShieldCheck size={20} />
        </div>
        <span className="font-semibold tracking-tight">PrivacyLens</span>
      </div>

      <nav aria-label="Main navigation" className="flex items-center gap-1">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-cyan-400/10 text-cyan-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}