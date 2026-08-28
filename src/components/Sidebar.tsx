import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const nav: { to: string; label: string; icon: ReactNode; badge?: string }[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    to: "/alerts",
    label: "Alerts",
    badge: "23",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    to: "/rings",
    label: "Ring Explorer",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    to: "/checkout",
    label: "Agent Checkout",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1-1.065 2.5-2.5 1l-1.4-1.4" />
      </svg>
    ),
  },
  {
    to: "/policies",
    label: "Policy Studio",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    to: "/trustpasses",
    label: "TrustPass Registry",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
  },
  {
    to: "/metrics",
    label: "Metrics",
    icon: (
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className="glass w-56 flex flex-col border-r border-[rgba(99,102,241,0.2)] shrink-0 relative z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(99,102,241,0.15)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#6366f1] to-[#06b6d4] flex items-center justify-center glow-pulse">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-[#e2e8f0] font-display tracking-tight">TrustMesh</div>
            <div className="text-[10px] text-[#6366f1] font-mono tracking-widest">RISK PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 scroll-area">
        <div className="px-3 mb-2">
          <div className="text-[9px] font-semibold text-[#64748b] uppercase tracking-widest px-2 mb-1">Main</div>
        </div>
        {nav.slice(0, 3).map(item => (
          <NavItem key={item.to} item={item} />
        ))}
        <div className="px-3 mt-4 mb-2">
          <div className="text-[9px] font-semibold text-[#64748b] uppercase tracking-widest px-2 mb-1">Tools</div>
        </div>
        {nav.slice(3).map(item => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-4 border-t border-[rgba(99,102,241,0.15)]">
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>All systems nominal</span>
        </div>
        <div className="mt-2 text-[10px] text-[#64748b] font-mono">v2.4.1 · Prod</div>
      </div>
    </aside>
  );
}

function NavItem({ item }: { item: (typeof nav)[0] }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all relative group ${
          isActive
            ? "text-[#e2e8f0] bg-[rgba(99,102,241,0.15)] border-r-2 border-[#6366f1]"
            : "text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(99,102,241,0.05)]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-0 bg-linear-to-r from-[rgba(99,102,241,0.12)] to-transparent pointer-events-none" />
          )}
          <span className={isActive ? "text-[#6366f1]" : ""}>{item.icon}</span>
          <span className="flex-1 text-left font-medium">{item.label}</span>
          {item.badge && (
            <span className="bg-[rgba(239,68,68,0.2)] text-[#ef4444] border border-[rgba(239,68,68,0.3)] text-[10px] font-bold rounded-full px-1.5 py-0.5 font-mono">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}