import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import CaseDetail from "./pages/CaseDetail";
import RingExplorer from "./pages/RingExplorer";
import AgentCheckout from "./pages/AgentCheckout";
import PolicyStudio from "./pages/PolicyStudio";
import TrustPassRegistry from "./pages/TrustPassRegistry";
import Metrics from "./pages/Metrics";

const PARTICLE_DATA = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  animationDuration: `${8 + Math.random() * 16}s`,
  animationDelay: `${Math.random() * 12}s`,
  size: `${1 + Math.random() * 2}px`,
  background: i % 3 === 0 ? "#6366f1" : i % 3 === 1 ? "#06b6d4" : "#8b5cf6",
}));

function Particles() {
  return (
    <div className="particles-bg">
      {PARTICLE_DATA.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
            width: p.size,
            height: p.size,
            background: p.background,
          }}
        />
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="flex h-full relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.05) 0%, transparent 50%), #030712",
        }}
      >
        <Particles />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <TopBar />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/alerts/:alertId" element={<CaseDetail />} />
              <Route path="/rings" element={<RingExplorer />} />
              <Route path="/rings/:ringId" element={<RingExplorer />} />
              <Route path="/checkout" element={<AgentCheckout />} />
              <Route path="/policies" element={<PolicyStudio />} />
              <Route path="/trustpasses" element={<TrustPassRegistry />} />
              <Route path="/metrics" element={<Metrics />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}