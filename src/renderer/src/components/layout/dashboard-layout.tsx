import { FileText, LayoutDashboard, Settings } from 'lucide-react';
import React from 'react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="border-border bg-card flex w-64 flex-col gap-4 border-r p-4">
        <div className="font-display mb-4 px-2 text-xl font-semibold">Meeting Transcriber</div>
        <nav className="flex flex-col gap-1">
          <button className="bg-accent text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2">
            <LayoutDashboard size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <button className="hover:bg-muted text-muted-foreground flex items-center gap-3 rounded-md px-3 py-2 transition-colors">
            <FileText size={18} />
            <span className="text-sm font-medium">History</span>
          </button>
        </nav>
        <div className="mt-auto">
          <button className="hover:bg-muted text-muted-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 transition-colors">
            <Settings size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex h-full flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
