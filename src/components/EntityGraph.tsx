import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
  Position,
} from "@xyflow/react";

import type { ReactNode } from "react";

import "@xyflow/react/dist/style.css";

type GraphNode = {
  id: string;
  type: string;
  label: string;
  properties: {
    customer_id?: string;
    ring_id?: string | null;
    device_hash?: string;
    order_id?: string;
    amount?: number;
    timestamp?: string;
    code?: string;
    refund_id?: string;
    refund_ref_hash?: string;

    [key: string]: unknown;
  };
};

type GraphEdge = {
  source: string;
  target: string;
  relationship: string;
  properties: Record<string, unknown>;
};

type AlertGraph = {
  alert_id: string;
  customer_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    node_count: number;
    edge_count: number;
    shared_customer_count: number;
    ring_id: string | null;
  };
};

type EntityGraphProps = {
  graph: AlertGraph;
};

type EntityFlowNode = Node<{
  label: ReactNode;
}>;
/*
 * ---------------------------------------------------------------
 * Visual configuration
 * ---------------------------------------------------------------
 */

const NODE_COLORS: Record<
  string,
  {
    border: string;
    background: string;
    text: string;
    icon: string;
  }
> = {
  Customer: {
    border: "#3b82f6",
    background: "rgba(59,130,246,0.12)",
    text: "#93c5fd",
    icon: "👤",
  },

  Device: {
    border: "#8b5cf6",
    background: "rgba(139,92,246,0.12)",
    text: "#c4b5fd",
    icon: "📱",
  },

  Order: {
    border: "#06b6d4",
    background: "rgba(6,182,212,0.12)",
    text: "#67e8f9",
    icon: "📦",
  },

  Coupon: {
    border: "#10b981",
    background: "rgba(16,185,129,0.12)",
    text: "#6ee7b7",
    icon: "🎟️",
  },

  Refund: {
    border: "#f97316",
    background: "rgba(249,115,22,0.12)",
    text: "#fdba74",
    icon: "↩️",
  },

  RefundDestination: {
    border: "#f59e0b",
    background: "rgba(245,158,11,0.12)",
    text: "#fcd34d",
    icon: "🏦",
  },
};

const DEFAULT_NODE_COLOR = {
  border: "#64748b",
  background: "rgba(100,116,139,0.12)",
  text: "#cbd5e1",
  icon: "●",
};

/*
 * ---------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------
 */

function getNodeStyle(node: GraphNode, isSubject: boolean) {
  const config =
    NODE_COLORS[node.type] || DEFAULT_NODE_COLOR;

  return {
    background: isSubject
      ? "rgba(99,102,241,0.20)"
      : config.background,

    border: `1.5px solid ${
      isSubject ? "#6366f1" : config.border
    }`,

    borderRadius: 10,

    color: "#e2e8f0",

    width: node.type === "Customer" ? 175 : 165,

    padding: 10,

    boxShadow: isSubject
      ? "0 0 22px rgba(99,102,241,0.25)"
      : "0 6px 20px rgba(0,0,0,0.18)",
  };
}

function getNodeLabel(node: GraphNode) {
  if (node.type === "Customer") {
    return node.label;
  }

  if (node.type === "Device") {
    return node.label.length > 18
      ? `${node.label.slice(0, 18)}…`
      : node.label;
  }

  if (node.type === "Order") {
    return node.label.length > 20
      ? `${node.label.slice(0, 20)}…`
      : node.label;
  }

  return node.label;
}

/*
 * ---------------------------------------------------------------
 * Layout
 * ---------------------------------------------------------------
 *
 * The graph is intentionally arranged by entity type rather than
 * relying on an automatic layout library.
 *
 * This gives us a predictable fraud-investigation view:
 *
 *              shared customers
 *                    │
 *                  Device
 *                    │
 *              main Customer
 *                    │
 *          Order ─── Coupon
 *
 * Additional shared customers are distributed around the graph.
 */

function createNodePositions(
  graphNodes: GraphNode[],
  customerId: string
) {
  const positions = new Map<
    string,
    { x: number; y: number }
  >();

  const subjectId = `customer:${customerId}`;

  positions.set(subjectId, {
    x: 520,
    y: 300,
  });

  const devices = graphNodes.filter(
    (node) => node.type === "Device"
  );

  const orders = graphNodes.filter(
    (node) => node.type === "Order"
  );

  const coupons = graphNodes.filter(
    (node) => node.type === "Coupon"
  );

  const refunds = graphNodes.filter(
    (node) => node.type === "Refund"
  );

  const refundDestinations = graphNodes.filter(
    (node) => node.type === "RefundDestination"
  );

  const otherCustomers = graphNodes.filter(
    (node) =>
      node.type === "Customer" &&
      node.id !== subjectId
  );

  /*
   * Device
   */
  devices.forEach((node, index) => {
    positions.set(node.id, {
      x: 520 + index * 210,
      y: 80,
    });
  });

  /*
   * Orders
   */
  orders.forEach((node, index) => {
    positions.set(node.id, {
      x: 250 + index * 210,
      y: 500,
    });
  });

  /*
   * Coupons
   */
  coupons.forEach((node, index) => {
    positions.set(node.id, {
      x: 700 + index * 210,
      y: 500,
    });
  });

  /*
   * Refunds
   */
  refunds.forEach((node, index) => {
    positions.set(node.id, {
      x: 950 + index * 210,
      y: 650,
    });
  });

  /*
   * Refund destinations
   */
  refundDestinations.forEach((node, index) => {
    positions.set(node.id, {
      x: 1150 + index * 210,
      y: 650,
    });
  });

  /*
   * Shared customers.
   *
   * Place them around the top and sides so that the
   * shared-device/shared-coupon structure is visible.
   */
  otherCustomers.forEach((node, index) => {
    const columns = 4;

    const column = index % columns;
    const row = Math.floor(index / columns);

    positions.set(node.id, {
      x: 70 + column * 220,
      y: 80 + row * 150,
    });
  });

  return positions;
}

/*
 * ---------------------------------------------------------------
 * Main component
 * ---------------------------------------------------------------
 */

export default function EntityGraph({
  graph,
}: EntityGraphProps) {
  const subjectCustomerId = graph.customer_id;

  const positions = createNodePositions(
    graph.nodes,
    subjectCustomerId
  );

  const nodes: EntityFlowNode[] = graph.nodes.map(
    (graphNode) => {
      const config =
        NODE_COLORS[graphNode.type] ||
        DEFAULT_NODE_COLOR;

      const isSubject =
        graphNode.id ===
        `customer:${subjectCustomerId}`;

      const position =
        positions.get(graphNode.id) || {
          x: 500,
          y: 300,
        };

      return {
        id: graphNode.id,

        position,

        sourcePosition: Position.Right,
        targetPosition: Position.Left,

        data: {
          label: (
            <div
              className="font-sans"
              title={graphNode.label}
            >
              <div
                className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{
                  color: isSubject
                    ? "#a5b4fc"
                    : config.text,
                }}
              >
                <span>{config.icon}</span>

                <span>
                  {graphNode.type}
                </span>

                {isSubject && (
                  <span className="ml-auto text-[8px] text-[#a5b4fc]">
                    SUBJECT
                  </span>
                )}
              </div>

              <div className="mt-1 text-[10px] font-mono text-[#e2e8f0] truncate">
                {getNodeLabel(graphNode)}
              </div>

              {graphNode.type === "Customer" &&
                graphNode.properties.ring_id && (
                  <div className="mt-1 text-[8px] font-mono text-[#f59e0b]">
                    {String(
                      graphNode.properties.ring_id
                    )}
                  </div>
                )}

              {graphNode.type === "Order" &&
                graphNode.properties.amount !==
                  undefined && (
                  <div className="mt-1 text-[8px] text-[#67e8f9]">
                    ₹
                    {Number(
                      graphNode.properties.amount
                    ).toLocaleString("en-IN")}
                  </div>
                )}
            </div>
          ),
        },

        style: getNodeStyle(
          graphNode,
          isSubject
        ),

        draggable: true,
      };
    }
  );

  const edges: Edge[] = graph.edges.map(
    (graphEdge, index) => {
      const evidence =
        graphEdge.properties.evidence;

      const isEvidenceEdge =
        Boolean(evidence);

      return {
        id: `edge-${index}`,

        source: graphEdge.source,

        target: graphEdge.target,

        label: graphEdge.relationship,

        type: "smoothstep",

        animated: isEvidenceEdge,

        style: {
          stroke: isEvidenceEdge
            ? "#8b5cf6"
            : "#475569",

          strokeWidth: isEvidenceEdge
            ? 1.8
            : 1.2,
        },

        labelStyle: {
          fill: isEvidenceEdge
            ? "#a78bfa"
            : "#64748b",

          fontSize: 8,

          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
        },

        labelBgStyle: {
          fill: "#080d1f",

          fillOpacity: 0.9,
        },

        markerEnd: {
          type: MarkerType.ArrowClosed,

          color: isEvidenceEdge
            ? "#8b5cf6"
            : "#475569",
        },
      };
    }
  );

  return (
    <div className="relative h-105 w-full rounded-lg overflow-hidden border border-[rgba(99,102,241,0.12)] bg-[#060a18]">
      {/* =======================================================
          Graph header
      ======================================================= */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#e2e8f0]">
            Live Neo4j Evidence
          </span>

          <span className="text-[8px] px-1.5 py-0.5 rounded border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] text-[#10b981] font-mono">
            LIVE
          </span>
        </div>

        <div className="text-[8px] text-[#64748b] mt-1">
          {graph.summary.node_count} nodes ·{" "}
          {graph.summary.edge_count} relationships
        </div>
      </div>

      {/* =======================================================
          Evidence summary
      ======================================================= */}
      <div className="absolute top-3 right-3 z-10 pointer-events-none">
        <div className="text-right">
          {graph.summary.ring_id && (
            <div className="text-[9px] font-mono text-[#f59e0b]">
              {graph.summary.ring_id}
            </div>
          )}

          <div className="text-[8px] text-[#64748b] mt-1">
            {graph.summary.shared_customer_count} shared
            customers
          </div>
        </div>
      </div>

      {/* =======================================================
          React Flow
      ======================================================= */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
          padding: 0.18,
          minZoom: 0.35,
          maxZoom: 1.2,
        }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{
          hideAttribution: true,
        }}
        className="h-full w-full"
      >
        <Background
          gap={24}
          size={1}
          color="#17203b"
        />

        <Controls
          showInteractive={false}
          className="bg-[#0b1024]! border-[rgba(99,102,241,0.2)]!"
        />
      </ReactFlow>

      {/* =======================================================
          Legend
      ======================================================= */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
        {[
          "Customer",
          "Device",
          "Order",
          "Coupon",
          "Refund",
        ].map((type) => {
          const config =
            NODE_COLORS[type];

          return (
            <div
              key={type}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[rgba(5,10,25,0.88)] border border-[rgba(99,102,241,0.12)]"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    config.border,
                }}
              />

              <span className="text-[7px] text-[#64748b]">
                {type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}