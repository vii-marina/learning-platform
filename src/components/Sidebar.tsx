import { useState } from "react";

const navItems = [
  { label: "Overview" },
  { label: "Explore Courses" },
  { label: "My Courses" },
  { label: "Messages" },
  { label: "Settings" },
  { label: "Logout" },
];

function NavIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-slate-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 6h16M4 12h12M4 18h8" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipText = isOpen ? "Закрити бічну панель" : "Відкрити бічну панель";

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-slate-200 bg-white shadow-lg transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <span
          className={`text-sm font-semibold text-slate-900 transition-opacity duration-200 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          Menu
        </span>
        <div className="group relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <NavIcon />
          </button>
          <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            {tooltipText}
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2 pb-6">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <NavIcon />
            <span
              className={`transition-opacity duration-200 ${
                isOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
