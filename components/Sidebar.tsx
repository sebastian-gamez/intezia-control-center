"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Tablero", icon: "🗂️" },
  { href: "/guiones", label: "Todos los guiones", icon: "📄" },
  { href: "/grabar", label: "Grabar", icon: "🎬" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-panel md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          IN
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Centro de Control</div>
          <div className="text-[11px] text-slate-400">Intezia · Contenido</div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-0">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-brand/15 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden px-4 py-3 text-[11px] text-slate-500 md:block">
        Los cambios se guardan en los guiones .md de la fábrica.
      </div>
    </aside>
  );
}
