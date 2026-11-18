"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demoMode";
import { signOut } from "@/services/authService";

const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/tasks", label: "Tasks" },
  { href: "/feedback", label: "Feedback" }
];

export function AppShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace(isDemoMode ? "/" : "/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-28 pt-6 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.22em] text-ember">{eyebrow}</p> : null}
          <h1 className="text-4xl font-black tracking-[-0.045em] text-ink">{title}</h1>
          {isDemoMode ? (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Demo · no account required</p>
          ) : null}
        </div>
        <button className="secondary-button px-4 py-2 text-xs" onClick={handleSignOut} type="button">
          {isDemoMode ? "Reset demo" : "Log out"}
        </button>
      </header>
      <section className="flex-1">{children}</section>
      <nav className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md rounded-full border border-white/70 bg-ink/90 p-2 shadow-soft backdrop-blur">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              className={`flex-1 rounded-full px-3 py-3 text-center text-sm font-bold transition ${
                active ? "bg-cream text-ink" : "text-cream/75 hover:text-cream"
              }`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
