"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (confirm("Deseja realmente sair do painel administrativo?")) {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
        });
        if (response.ok) {
          router.push("/login");
          router.refresh();
        }
      } catch (error) {
        console.error("Erro ao sair:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-red-950/20 hover:text-red-400 disabled:opacity-50"
    >
      {loading ? (
        <svg
          className="h-5 w-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      )}
      <span>Sair da Sessão</span>
    </button>
  );
}
