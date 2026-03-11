"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Users, Globe, Activity, FileText, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/sites", label: "Sites", icon: Globe },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: Activity },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];


export function Sidebar() {
  const pathname = usePathname() || "";

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex-col hidden md:flex min-h-screen p-4 shrink-0 transition-all border-r border-slate-800">
      <div className="mb-10 px-4 mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-widest">ARTNA<span className="text-emerald-400">CARE</span></h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-4 py-4 text-xs text-slate-500 font-medium">
        &copy; {new Date().getFullYear()} ArtnaCare V2
      </div>
    </aside>
  );
}
