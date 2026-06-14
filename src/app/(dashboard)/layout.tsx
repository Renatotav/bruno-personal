import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SidebarNav from "@/components/SidebarNav";
import MobileNav from "@/components/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await isAuthenticated();

  if (!auth) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07090e] text-slate-100 font-sans">
      {/* Sidebar - fixed and responsive on desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80">
              <svg
                className="h-4.5 w-4.5 text-teal-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="font-semibold text-white tracking-wide">Bruno Personal</span>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <SidebarNav />
        </div>

        {/* Footer Sidebar (Logout) */}
        <div className="p-4 border-t border-slate-800">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/20 px-6 backdrop-blur-md">
          {/* Mobile header: hamburger + logo */}
          <div className="flex items-center space-x-3 md:hidden">
            <MobileNav />
            <span className="font-semibold text-white">Bruno Personal</span>
          </div>

          <div className="hidden md:flex items-center space-x-1 text-sm text-slate-400">
            <span>Administração</span>
            <span className="text-slate-600">/</span>
            <span className="text-teal-400 font-medium">Painel</span>
          </div>

          {/* Quick info / Profile */}
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-500 bg-slate-800/40 border border-slate-800 px-2 py-1 rounded-md">
              VPS Easypanel
            </span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">Administrador</span>
          </div>
        </header>

        {/* Content view */}
        <main className="flex-1 overflow-y-auto bg-[#07090e] p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
