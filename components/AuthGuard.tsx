"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (!ready) {
    return <div className="card text-center text-moss">Warming up your schedule...</div>;
  }

  return <>{children}</>;
}
