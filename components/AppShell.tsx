"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demoMode";
import { signOut } from "@/services/authService";

const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/tasks", label: "Tasks" },
  { href: "/goals", label: "Goals" },
  { href: "/calendar", label: "Week" },
  { href: "/feedback", label: "Feedback" }
];

export function AppShell({ children, title }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace(isDemoMode ? "/" : "/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-24 pt-8 sm:px-6">
      <header className="mb-10 flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-mist">FlowState</p>
          <h1 className="text-2xl font-medium tracking-tight text-charcoal">{title}</h1>
          {isDemoMode ? <p className="text-sm text-mist">Demo · browser only</p> : null}
        </div>
        <button className="text-button" onClick={handleSignOut} type="button">
          {isDemoMode ? "Reset" : "Log out"}
        </button>
      </header>

      <section className="flex-1">{children}</section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-linen bg-paper">
        <div className="mx-auto flex max-w-2xl">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                className={`flex-1 py-3.5 text-center text-sm transition ${
                  active ? "text-charcoal" : "text-mist hover:text-charcoal"
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
