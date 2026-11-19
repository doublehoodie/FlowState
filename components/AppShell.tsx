"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demoMode";
import { signOut } from "@/services/authService";

const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/calendar", label: "Week" },
  { href: "/tasks", label: "Tasks" },
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-stone pb-5">
        <div className="space-y-1">
          <p className="font-brand text-lg text-clay">FlowState</p>
          <h1 className="text-3xl font-semibold tracking-tight text-bark">{title}</h1>
          {isDemoMode ? <p className="text-sm text-mist">Demo · data stays in this browser</p> : null}
        </div>
        <button className="text-button" onClick={handleSignOut} type="button">
          {isDemoMode ? "Reset demo" : "Log out"}
        </button>
      </header>

      <section className="flex-1">{children}</section>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                className={`flex-1 py-3.5 text-center text-sm font-medium transition ${
                  active ? "border-t-2 border-clay text-bark" : "border-t-2 border-transparent text-mist hover:text-walnut"
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
