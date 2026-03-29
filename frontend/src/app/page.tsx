"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStoredToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = getStoredToken();
    router.replace(t ? "/dashboard" : "/login");
    setDone(true);
  }, [router]);

  if (!done) {
    return (
      <div className="app-shell flex min-h-full flex-1 flex-col items-center justify-center px-4">
        <div className="app-content flex flex-col items-center gap-4 text-center">
          <div
            className="h-10 w-10 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin"
            aria-hidden
          />
          <p className="text-sm text-[var(--text-muted)]">Opening your workspace…</p>
        </div>
      </div>
    );
  }

  return null;
}
