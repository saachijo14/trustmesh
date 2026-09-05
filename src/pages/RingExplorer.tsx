import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { getRing, getRings } from "../api/client";

type NodeType = "customer" | "device" | "coupon" | "refund";

interface RingSummary {
  ring_id: string;
  customer_ids: string[];
  size: number;
  edge_count: number;
  signals: string[] | Record<string, unknown>;
}

interface RingCustomer {
  customer_id: string;
  ring_id: string | null;
}

interface RingEdge {
  source: string;
  target: string;
  relationship: string;
  shared_entity: string;
}

interface RingDetail extends RingSummary {
  customers: RingCustomer[];
  edges: RingEdge[];
}

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  risk?: number;
  connections: number;
}

const nodeColors: Record<NodeType, string> = {
  customer: "#3b82f6",
  device: "#8b5cf6",
  coupon: "#10b981",
  refund: "#ef4444",
};

const nodeLabels: Record<NodeType, string> = {
  customer: "Customer",
  device: "Device",
  coupon: "Coupon",
  refund: "Refund Dest.",
};

const relationshipTypeToNodeType = (
  relationship: string
): NodeType => {
  if (relationship === "DEVICE_SHARED") return "device";
  if (relationship === "COUPON_SHARED") return "coupon";
  return "refund";
};

const formatRelationship = (relationship: string) =>
  relationship
    .replaceAll("_", " ")
    .replace("SHARED", "SHARED");

const getSignals = (
  signals: string[] | Record<string, unknown>
): string[] => {
  if (Array.isArray(signals)) {
    return signals.map(String);
  }

  return Object.entries(signals).map(
    ([key, value]) => `${key}: ${String(value)}`
  );
};

export default function RingExplorer() {
  const [rings, setRings] = useState<RingSummary[]>([]);
  const [selectedRingId, setSelectedRingId] = useState("");
  const [ring, setRing] = useState<RingDetail | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const [filterType, setFilterType] =
    useState<NodeType | "all">("all");

  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({
    x: 0,
    y: 0,
  });

  const [loadingRings, setLoadingRings] = useState(true);
  const [loadingRing, setLoadingRing] = useState(false);
  const [error, setError] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);

  /*
   * Load all detected rings.
   */
  const loadRings = useCallback(async () => {
    setLoadingRings(true);
    setError("");

    try {
      const data = await getRings();

      const ringList = Array.isArray(data)
        ? (data as RingSummary[])
        : [];

      setRings(ringList);

      if (ringList.length > 0) {
        setSelectedRingId((current) =>
          current &&
          ringList.some((item) => item.ring_id === current)
            ? current
            : ringList[0].ring_id
        );
      } else {
        setSelectedRingId("");
        setRing(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load rings."
      );
    } finally {
      setLoadingRings(false);
    }
  }, []);

  useEffect(() => {
    // The async loader updates state after the API response arrives.
  // This is intentional because the effect synchronizes the page with backend policy state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRings();
  }, [loadRings]);

  /*
   * Load the selected ring's detailed graph.
   */
  const loadRingDetail = useCallback(async () => {
    if (!selectedRingId) return;

    setLoadingRing(true);
    setError("");
    setSelected(null);
    setFilterType("all");

    try {
      const data = (await getRing(
        selectedRingId
      )) as RingDetail;

      setRing(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load ring details."
      );
      setRing(null);
    } finally {
      setLoadingRing(false);
    }
  }, [selectedRingId]);

  useEffect(() => {
    // The async loader updates state after the API response arrives.
  // This is intentional because the effect synchronizes the page with backend policy state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRingDetail();
  }, [loadRingDetail]);

  /*
   * Convert backend ring relationships into a graph.
   *
   * Backend gives:
   * customer A -> customer B
   * relationship
   * shared entity
   *
   * We render:
   * customer A -> shared entity -> customer B
   */
  useEffect(() => {
    if (!ring) {
      // The async loader updates state after the API response arrives.
  // This is intentional because the effect synchronizes the page with backend policy state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
      setNodes([]);
      return;
    }

    const customerIds = ring.customer_ids ?? [];
    const backendEdges = ring.edges ?? [];

    const entityMap = new Map<
      string,
      { type: NodeType; label: string }
    >();

    backendEdges.forEach((edge) => {
      const type = relationshipTypeToNodeType(
        edge.relationship
      );

      const entityId = `${type}:${edge.shared_entity}`;

      entityMap.set(entityId, {
        type,
        label: edge.shared_entity,
      });
    });

    const graphNodes: GraphNode[] = [];

    const width = 760;
    const height = 620;

    /*
     * Customers arranged around the outside.
     */
    customerIds.forEach((customerId, index) => {
      const angle =
        (index / Math.max(customerIds.length, 1)) *
        Math.PI *
        2;

      const radius =
        customerIds.length <= 8
          ? 205
          : Math.min(255, 160 + customerIds.length * 4);

      graphNodes.push({
        id: `customer:${customerId}`,
        type: "customer",
        label: customerId,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        connections: 0,
      });
    });

    /*
     * Shared entities arranged around the center.
     */
    const entities = Array.from(entityMap.entries());

    entities.forEach(([id, entity], index) => {
      const angle =
        (index / Math.max(entities.length, 1)) *
        Math.PI *
        2;

      const radius = Math.min(
        120,
        Math.max(55, entities.length * 18)
      );

      graphNodes.push({
        id,
        type: entity.type,
        label: entity.label,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        connections: 0,
      });
    });

    /*
     * Calculate actual graph degrees.
     */
    const connectionCounts = new Map<string, number>();

    backendEdges.forEach((edge) => {
      const sourceId = `customer:${edge.source}`;
      const targetId = `customer:${edge.target}`;
      const entityType = relationshipTypeToNodeType(
        edge.relationship
      );
      const entityId = `${entityType}:${edge.shared_entity}`;

      [sourceId, targetId, entityId].forEach((id) => {
        connectionCounts.set(
          id,
          (connectionCounts.get(id) ?? 0) + 1
        );
      });
    });

    setNodes(
      graphNodes.map((node) => ({
        ...node,
        connections: connectionCounts.get(node.id) ?? 0,
      }))
    );
  }, [ring]);

  const visibleNodes = useMemo(() => {
    if (filterType === "all") return nodes;

    return nodes.filter(
      (node) => node.type === filterType
    );
  }, [nodes, filterType]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const graphConnections = useMemo(() => {
    if (!ring) return [];

    return ring.edges.flatMap((edge, index) => {
      const type = relationshipTypeToNodeType(
        edge.relationship
      );

      const entityId = `${type}:${edge.shared_entity}`;
      const sourceId = `customer:${edge.source}`;
      const targetId = `customer:${edge.target}`;

      if (
        !visibleNodeIds.has(sourceId) ||
        !visibleNodeIds.has(targetId) ||
        !visibleNodeIds.has(entityId)
      ) {
        return [];
      }

      return [
        {
          id: `${index}-source`,
          from: sourceId,
          to: entityId,
          relationship: edge.relationship,
          sharedEntity: edge.shared_entity,
        },
        {
          id: `${index}-target`,
          from: entityId,
          to: targetId,
          relationship: edge.relationship,
          sharedEntity: edge.shared_entity,
        },
      ];
    });
  }, [ring, visibleNodeIds]);

  const getNode = useCallback(
    (id: string) => nodes.find((node) => node.id === id),
    [nodes]
  );

  const handleMouseDown = (
    event: MouseEvent,
    nodeId: string
  ) => {
    event.preventDefault();

    const node = getNode(nodeId);

    if (!node) return;

    setDragging(nodeId);

    setDragOffset({
      x: event.clientX / zoom - node.x,
      y: event.clientY / zoom - node.y,
    });
  };

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragging) return;

      setNodes((previous) =>
        previous.map((node) =>
          node.id === dragging
            ? {
                ...node,
                x:
                  event.clientX / zoom -
                  dragOffset.x,
                y:
                  event.clientY / zoom -
                  dragOffset.y,
              }
            : node
        )
      );

      setSelected((previous) =>
        previous?.id === dragging
          ? {
              ...previous,
              x:
                event.clientX / zoom -
                dragOffset.x,
              y:
                event.clientY / zoom -
                dragOffset.y,
            }
          : previous
      );
    },
    [dragging, dragOffset, zoom]
  );

  const handleMouseUp = () => {
    setDragging(null);
  };

  const keyHubs = useMemo(() => {
    return [...nodes]
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);
  }, [nodes]);

  const signals = ring
    ? getSignals(ring.signals ?? [])
    : [];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="glass border-b border-[rgba(99,102,241,0.2)] px-5 py-3 flex items-center gap-4 shrink-0">
        <h1 className="text-sm font-bold text-[#e2e8f0] font-display">
          Ring Explorer
        </h1>

        <div className="h-4 w-px bg-[rgba(99,102,241,0.2)]" />

        {/* Real ring selector */}
        {loadingRings ? (
          <span className="text-xs text-[#64748b]">
            Loading rings…
          </span>
        ) : rings.length > 0 ? (
          <select
            value={selectedRingId}
            onChange={(event) =>
              setSelectedRingId(event.target.value)
            }
            className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.35)] text-[#ef4444] text-xs font-mono rounded px-3 py-1.5 outline-none"
          >
            {rings.map((item) => (
              <option
                key={item.ring_id}
                value={item.ring_id}
                className="bg-[#0b1020] text-[#e2e8f0]"
              >
                {item.ring_id} · {item.size} nodes
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-[#64748b]">
            No detected rings
          </span>
        )}

        <div className="h-4 w-px bg-[rgba(99,102,241,0.2)]" />

        {/* Node filters */}
        <div className="flex gap-1">
          {(
            ["all", "customer", "device", "coupon", "refund"] as (
              | NodeType
              | "all"
            )[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                filterType === type
                  ? "bg-[rgba(99,102,241,0.2)] text-[#6366f1] border border-[rgba(99,102,241,0.4)]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              }`}
              style={
                filterType === type &&
                type !== "all"
                  ? {
                      color:
                        nodeColors[
                          type as NodeType
                        ],
                    }
                  : {}
              }
            >
              {type === "all"
                ? "All"
                : nodeLabels[type]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setZoom((value) =>
                  Math.max(0.5, value - 0.1)
                )
              }
              className="btn-ghost w-7 h-7 rounded flex items-center justify-center text-sm"
              aria-label="Zoom out"
            >
              −
            </button>

            <span className="text-xs text-[#64748b] w-12 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={() =>
                setZoom((value) =>
                  Math.min(2, value + 0.1)
                )
              }
              className="btn-ghost w-7 h-7 rounded flex items-center justify-center text-sm"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Graph */}
        <div className="flex-1 relative overflow-hidden bg-[rgba(3,7,18,0.95)]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {loadingRing ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#64748b]">
              Loading ring evidence…
            </div>
          ) : !ring ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#64748b]">
              Select a detected ring to inspect.
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox="0 0 760 620"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 w-full h-full cursor-grab"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
              }}
            >
              <defs>
                <filter id="ringNodeGlow">
                  <feGaussianBlur
                    stdDeviation="3"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <marker
                  id="ringArrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path
                    d="M 0 0 L 6 3 L 0 6 z"
                    fill="rgba(99,102,241,0.5)"
                  />
                </marker>
              </defs>

              {/* Relationships */}
              {graphConnections.map((connection) => {
                const from = getNode(connection.from);
                const to = getNode(connection.to);

                if (!from || !to) return null;

                const highlighted =
                  selected?.id === from.id ||
                  selected?.id === to.id;

                return (
                  <g key={connection.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={
                        highlighted
                          ? "#ef4444"
                          : "rgba(99,102,241,0.3)"
                      }
                      strokeWidth={
                        highlighted ? 2.5 : 1.2
                      }
                      markerEnd={
                        highlighted
                          ? "url(#ringArrow)"
                          : undefined
                      }
                    />

                    {highlighted && (
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2 - 5}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8"
                      >
                        {formatRelationship(
                          connection.relationship
                        )}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {visibleNodes.map((node) => {
                const color = nodeColors[node.type];
                const isSelected =
                  selected?.id === node.id;

                const radius =
                  node.type === "customer" ? 16 : 11;

                return (
                  <g
                    key={node.id}
                    onMouseDown={(event) =>
                      handleMouseDown(
                        event,
                        node.id
                      )
                    }
                    onClick={() =>
                      setSelected(
                        isSelected ? null : node
                      )
                    }
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 8}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        opacity={0.5}
                      />
                    )}

                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill={color}
                      opacity={0.9}
                      filter="url(#ringNodeGlow)"
                      stroke={
                        isSelected
                          ? "white"
                          : "none"
                      }
                      strokeWidth={
                        isSelected ? 2 : 0
                      }
                    />

                    <text
                      x={node.x}
                      y={node.y + radius + 11}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8"
                      className="select-none"
                    >
                      {node.label.length > 18
                        ? `${node.label.slice(
                            0,
                            18
                          )}…`
                        : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 glass border-l border-[rgba(99,102,241,0.2)] flex flex-col overflow-y-auto">
          {/* Legend */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">
              Legend
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                Object.keys(
                  nodeColors
                ) as NodeType[]
              ).map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setFilterType(
                      filterType === type
                        ? "all"
                        : type
                    )
                  }
                  className={`flex items-center gap-1.5 text-[10px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors p-1 rounded ${
                    filterType === type
                      ? "bg-[rgba(99,102,241,0.1)]"
                      : ""
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      background:
                        nodeColors[type],
                    }}
                  />

                  {nodeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Ring summary */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">
              Ring Summary
            </div>

            {ring ? (
              <>
                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-[#64748b]">
                    Ring ID
                  </span>
                  <span className="text-[#e2e8f0] font-mono">
                    {ring.ring_id}
                  </span>
                </div>

                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-[#64748b]">
                    Customers
                  </span>
                  <span className="text-[#e2e8f0] font-mono">
                    {ring.size}
                  </span>
                </div>

                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-[#64748b]">
                    Shared Relationships
                  </span>
                  <span className="text-[#e2e8f0] font-mono">
                    {ring.edge_count}
                  </span>
                </div>

                <div className="flex justify-between text-xs py-0.5">
                  <span className="text-[#64748b]">
                    Graph Nodes
                  </span>
                  <span className="text-[#e2e8f0] font-mono">
                    {nodes.length}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-xs text-[#64748b]">
                No ring selected.
              </span>
            )}
          </div>

          {/* Detection signals */}
          {ring && signals.length > 0 && (
            <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
              <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">
                Detection Signals
              </div>

              <div className="space-y-1.5">
                {signals.map((signal, index) => (
                  <div
                    key={index}
                    className="text-[10px] text-[#94a3b8] bg-[rgba(99,102,241,0.07)] rounded px-2 py-1.5"
                  >
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Node inspector */}
          <div className="p-4 border-b border-[rgba(99,102,241,0.15)]">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">
              Node Inspector
            </div>

            {selected ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        nodeColors[selected.type] +
                        "33",
                      border: `1.5px solid ${nodeColors[selected.type]}`,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background:
                          nodeColors[
                            selected.type
                          ],
                      }}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-mono text-[#e2e8f0] font-semibold break-all">
                      {selected.label}
                    </div>

                    <div
                      className="text-[10px] capitalize"
                      style={{
                        color:
                          nodeColors[
                            selected.type
                          ],
                      }}
                    >
                      {nodeLabels[selected.type]}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-[#64748b]">
                    Connections
                  </span>

                  <span className="font-mono font-bold text-[#e2e8f0]">
                    {selected.connections}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-[#64748b] italic">
                Click a node to inspect.
              </div>
            )}
          </div>

          {/* Key hubs */}
          <div className="p-4">
            <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-widest mb-2">
              Key Hubs
            </div>

            {keyHubs.length === 0 ? (
              <div className="text-xs text-[#64748b]">
                No graph hubs available.
              </div>
            ) : (
              keyHubs.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() =>
                    setSelected(hub)
                  }
                  className="w-full flex items-center gap-2 py-1.5 hover:bg-[rgba(99,102,241,0.07)] rounded px-1 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background:
                        nodeColors[hub.type],
                    }}
                  />

                  <span className="text-[10px] font-mono text-[#94a3b8] flex-1 text-left truncate">
                    {hub.label}
                  </span>

                  <span className="text-[10px] text-[#64748b]">
                    {hub.connections} links
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}