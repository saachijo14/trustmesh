import { useState, useRef, useCallback } from "react";

type NodeType = "customer" | "device" | "address" | "coupon" | "order" | "refund" | "agent";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  risk?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  strength: number;
}

const nodeColors: Record<NodeType, string> = {
  customer: "#3b82f6",
  device: "#8b5cf6",
  address: "#f97316",
  coupon: "#10b981",
  order: "#64748b",
  refund: "#ef4444",
  agent: "#ec4899",
};

const initNodes: GraphNode[] = [
  { id: "c1", type: "customer", label: "CUS-38821", x: 300, y: 200, risk: 94 },
  { id: "c2", type: "customer", label: "CUS-38905", x: 160, y: 130, risk: 78 },
  { id: "c3", type: "customer", label: "CUS-39102", x: 440, y: 130, risk: 65 },
  { id: "c4", type: "customer", label: "CUS-37801", x: 180, y: 290, risk: 81 },
  { id: "c5", type: "customer", label: "CUS-40012", x: 420, y: 290, risk: 57 },
  { id: "d1", type: "device", label: "DEV-fp-a4c3", x: 300, y: 80, risk: 88 },
  { id: "d2", type: "device", label: "DEV-fp-b7e1", x: 100, y: 200 },
  { id: "a1", type: "address", label: "ADDR-221b", x: 490, y: 200 },
  { id: "a2", type: "address", label: "ADDR-44mk", x: 80, y: 320 },
  { id: "cpn1", type: "coupon", label: "CPN-SAVE40", x: 300, y: 360, risk: 92 },
  { id: "o1", type: "order", label: "ORD-4421", x: 210, y: 200 },
  { id: "o2", type: "order", label: "ORD-4418", x: 390, y: 200 },
  { id: "r1", type: "refund", label: "REF-dest-11", x: 140, y: 380 },
  { id: "ag1", type: "agent", label: "AGENT-v3", x: 460, y: 380 },
];

const initEdges: GraphEdge[] = [
  { from: "c1", to: "d1", strength: 3 },
  { from: "c2", to: "d1", strength: 3 },
  { from: "c3", to: "d1", strength: 2 },
  { from: "c4", to: "d2", strength: 2 },
  { from: "c1", to: "a1", strength: 1 },
  { from: "c3", to: "a1", strength: 1 },
  { from: "c4", to: "a2", strength: 1 },
  { from: "c1", to: "cpn1", strength: 3 },
  { from: "c2", to: "cpn1", strength: 2 },
  { from: "c4", to: "cpn1", strength: 2 },
  { from: "c5", to: "cpn1", strength: 1 },
  { from: "c1", to: "o1", strength: 2 },
  { from: "c2", to: "o2", strength: 1 },
  { from: "r1", to: "c4", strength: 2 },
  { from: "ag1", to: "c1", strength: 3 },
  { from: "ag1", to: "c3", strength: 2 },
  { from: "o1", to: "r1", strength: 1 },
];

const legendItems = [
  { type: "customer", label: "Customer", color: "#3b82f6" },
  { type: "device", label: "Device", color: "#8b5cf6" },
  { type: "address", label: "Address", color: "#f97316" },
  { type: "coupon", label: "Coupon", color: "#10b981" },
  { type: "order", label: "Order", color: "#64748b" },
  { type: "refund", label: "Refund Dest.", color: "#ef4444" },
  { type: "agent", label: "Buyer Agent", color: "#ec4899" },
];

export default function RingExplorer() {
  const [nodes, setNodes] = useState(initNodes);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [timeSlider, setTimeSlider] = useState(100);
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const [showSafePanel, setShowSafePanel] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const visibleNodes = filterType === "all" ? nodes : nodes.filter(n => n.type === filterType);
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = initEdges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));

  const getNode = (id: string) => nodes.find(n => n.id === id);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging(nodeId);
    setDragOffset({ x: e.clientX / zoom - node.x, y: e.clientY / zoom - node.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setNodes(prev => prev.map(n =>
      n.id === dragging ? { ...n, x: e.clientX / zoom - dragOffset.x, y: e.clientY / zoom - dragOffset.y } : n
    ));
  }, [dragging, dragOffset, zoom]);

  const handleMouseUp = () => setDragging(null);

  const simulate = () => {
    setSimulating(true);
    setTimeout(() => setSimulating(false), 3000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="glass border-b border-[rgba(99,102,241,0.2)] px-5 py-3 flex items-center gap-4 shrink-0">
        <h1 className="text-sm font-bold text-[#e2e8f0] font-display">Ring Explorer</h1>
        <div className="h-4 w-px bg-[rgba(99,102,241,0.2)]" />
        <span className="text-xs font-mono text-[#ef4444] badge-critical px-2 py-0.5 rounded">RING-047 · 28 nodes</span>
        <div className="h-4 w-px bg-[rgba(99,102,241,0.2)]" />
        {/* Filter types */}
        <div className="flex gap-1">
          {(["all", ...legendItems.map(l => l.type)] as (NodeType | "all")[]).slice(0, 5).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${filterType === t ? "bg-[rgba(99,102,241,0.2)] text-[#6366f1] border border-[rgba(99,102,241,0.4)]" : "text-[#64748b] hover:text-[#94a3b8]"}`}
              style={filterType === t && t !== "all" ? { color: nodeColors[t as NodeType] } : {}}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {/* Time slider */}
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <span className="font-mono">Aug 1</span>
            <input type="range" min={0} max={100} value={timeSlider} onChange={e => setTimeSlider(+e.target.value)}
              className="w-28 accent-[#6366f1]" />
            <span className="font-mono">Aug 27</span>
          </div>
          <div className="h-4 w-px bg-[rgba(99,102,241,0.2)]" />
          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="btn-ghost w-7 h-7 rounded flex items-center justify-center text-sm">−</button>
            <span className="text-xs text-[#64748b] w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="btn-ghost w-7 h-7 rounded flex items-center justify-center text-sm">+</button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Graph canvas */}
        <div className="flex-1 relative overflow-hidden bg-[rgba(3,7,18,0.95)]">
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />

          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full cursor-grab"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          >
            <defs>
              <filter id="nodeGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="rgba(99,102,241,0.4)" />
              </marker>
            </defs>

            {/* Edges */}
            {visibleEdges.map((e, i) => {
              const from = getNode(e.from);
              const to = getNode(e.to);
              if (!from || !to) return null;
              const isHighlighted = selected?.id === e.from || selected?.id === e.to;
              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke={isHighlighted ? "#ef4444" : `rgba(99,102,241,${0.1 + e.strength * 0.1})`}
                  strokeWidth={isHighlighted ? 2.5 : e.strength * 0.8}
                  markerEnd={isHighlighted ? "url(#arrow)" : undefined}
                  filter={isHighlighted ? "url(#nodeGlow)" : undefined}
                />
              );
            })}

            {/* Nodes */}
            {visibleNodes.map(node => {
              const color = nodeColors[node.type];
              const isSelected = selected?.id === node.id;
              const r = node.type === "customer" ? 16 : 11;
              return (
                <g
                  key={node.id}
                  onMouseDown={e => handleMouseDown(e, node.id)}
                  onClick={() => setSelected(isSelected ? null : node)}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r={r + 8} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}
                      style={{ animation: "pulse-ring 1.5s ease-out infinite" }} />
                  )}
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={color}
                    opacity={0.85}
                    filter="url(#nodeGlow)"
                    stroke={isSelected ? "white" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                  {node.risk && node.risk > 80 && (
                    <circle cx={node.x + r - 3} cy={node.y - r + 3} r={4} fill="#ef4444" />
                  )}
                  <text x={node.x} y={node.y + r + 10} textAnchor="middle" fill="#94a3b8" fontSize="8" className="select-none">
                    {node.label.split("-")[0] + "-" + node.label.split("-")[1]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Panel */}
        <div className="w-72 glass border-l border-[rgba(99,102,241,0.2)] flex flex-col">
          {/* Legend */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Legend</div>
            <div className="grid grid-cols-2 gap-1.5">
              {legendItems.map(l => (
                <button
                  key={l.type}
                  onClick={() => setFilterType(filterType === l.type as NodeType ? "all" : l.type as NodeType)}
                  className={`flex items-center gap-1.5 text-[10px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors p-1 rounded ${filterType === l.type ? "bg-[rgba(99,102,241,0.1)]" : ""}`}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ring summary */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Ring Summary</div>
            {[
              { l: "Ring ID", v: "RING-047" },
              { l: "Total Nodes", v: "28" },
              { l: "Total Exposure", v: "₹42.1L" },
              { l: "Shared Devices", v: "3" },
              { l: "Shared Coupons", v: "2" },
              { l: "Flagged Orders", v: "14" },
              { l: "First Seen", v: "Aug 12, 2026" },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between text-xs py-0.5">
                <span className="text-[#64748b]">{l}</span>
                <span className="text-[#e2e8f0] font-mono">{v}</span>
              </div>
            ))}
          </div>

          {/* Node inspector */}
          {selected ? (
            <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
              <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Node Inspector</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: nodeColors[selected.type] + "33", border: `1.5px solid ${nodeColors[selected.type]}` }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: nodeColors[selected.type] }} />
                </div>
                <div>
                  <div className="text-xs font-mono text-[#e2e8f0] font-semibold">{selected.label}</div>
                  <div className="text-[10px] capitalize" style={{ color: nodeColors[selected.type] }}>{selected.type}</div>
                </div>
              </div>
              {selected.risk && (
                <div className="flex items-center gap-2 text-xs mb-2">
                  <span className="text-[#64748b]">Risk Score:</span>
                  <span className="font-mono font-bold text-[#ef4444]">{selected.risk}</span>
                </div>
              )}
              <div className="text-xs text-[#64748b]">Connections: {initEdges.filter(e => e.from === selected.id || e.to === selected.id).length}</div>
            </div>
          ) : (
            <div className="p-4 border-b border-[rgba(99,102,241,0.15)] text-xs text-[#64748b] italic">Click a node to inspect</div>
          )}

          {/* Key hubs */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Key Hubs</div>
            {[
              { id: "d1", label: "DEV-fp-a4c3", connections: 5, type: "device" as NodeType },
              { id: "c1", label: "CUS-38821", connections: 4, type: "customer" as NodeType },
              { id: "cpn1", label: "CPN-SAVE40", connections: 4, type: "coupon" as NodeType },
            ].map(hub => (
              <button
                key={hub.id}
                onClick={() => setSelected(nodes.find(n => n.id === hub.id) || null)}
                className="w-full flex items-center gap-2 py-1.5 hover:bg-[rgba(99,102,241,0.07)] rounded px-1 transition-colors"
              >
                <div className="w-2 h-2 rounded-full" style={{ background: nodeColors[hub.type] }} />
                <span className="text-[10px] font-mono text-[#94a3b8] flex-1 text-left">{hub.label}</span>
                <span className="text-[10px] text-[#64748b]">{hub.connections} links</span>
              </button>
            ))}
          </div>

          {/* Impact simulator */}
          <div className="p-4 flex-1">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">Impact Simulator</div>
            <button
              onClick={simulate}
              className={`w-full btn-ghost rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 mb-2 ${simulating ? "opacity-60" : ""}`}
            >
              {simulating ? (
                <><div className="w-3 h-3 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" /> Simulating…</>
              ) : "▶ Run Impact Sim"}
            </button>
            {simulating && (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[#64748b]">If blocked:</span><span className="text-[#10b981] font-mono">-₹42.1L exposure</span></div>
                <div className="flex justify-between"><span className="text-[#64748b]">FP risk:</span><span className="text-[#f59e0b] font-mono">12%</span></div>
                <div className="flex justify-between"><span className="text-[#64748b]">Cascade:</span><span className="text-[#ef4444] font-mono">+6 accounts</span></div>
              </div>
            )}
            <button
              onClick={() => setShowSafePanel(!showSafePanel)}
              className="w-full btn-primary rounded-lg py-2 text-xs font-medium mt-2"
            >
              Safe Action Panel
            </button>
            {showSafePanel && (
              <div className="mt-2 space-y-1.5">
                {["Freeze RING-047", "Restrict SAVE40", "Flag for review", "Notify team"].map(a => (
                  <button key={a} className="w-full text-left text-xs text-[#94a3b8] hover:text-[#e2e8f0] px-2 py-1.5 rounded hover:bg-[rgba(99,102,241,0.08)] transition-colors">{a}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
