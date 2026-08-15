"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email atau password salah. Coba lagi.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/icons/icon-192.png"
            alt="Vijimoto"
            width={72}
            height={72}
            className="rounded-2xl border-4 border-white shadow-lg"
          />
          <h1 className="font-display text-2xl font-semibold mt-4">
            Vijimoto Super POS
          </h1>
          <p className="text-ink-soft text-sm mt-1">Masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange"
              placeholder="nama@vijimoto.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-status-red-tx bg-status-red-bg rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange hover:bg-orange-deep transition-colors text-white
                       font-semibold text-sm rounded-pill py-2.5 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
