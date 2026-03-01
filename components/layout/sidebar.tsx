"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DossierLogo } from "@/components/shared/dossier-logo";
import {
  LayoutDashboard,
  Library,
  Search,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge-base", label: "Knowledge Base", icon: Library },
  { href: "/search", label: "Search", icon: Search },
  { href: "/qa", label: "Q&A", icon: MessageSquare },
  { href: "/evaluation", label: "Evaluation", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1 p-4", className)}>
      <div className="mb-6 px-2 flex items-center gap-2">
        <DossierLogo className="h-6 w-6" />
        <h1 className="text-xl font-serif tracking-tight">Dossier Lab</h1>
      </div>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
