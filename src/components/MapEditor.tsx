"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import type {
  RelationshipEdge,
  RelationshipNode,
  RelationshipNodeType,
} from "@/lib/types";

import styles from "./MapEditor.module.css";

interface MapEditorProps {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  onChange: (payload: {
    relationshipNodes: RelationshipNode[];
    relationshipEdges: RelationshipEdge[];
  }) => void;
}

const uid = () => crypto.randomUUID();
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// Nodes render on a black canvas — use white/off-white backgrounds with dark text.
// Border colour is the only type-specific accent.
function nodeTint(type: RelationshipNodeType) {
  const base = { background: "#f2eeea", color: "#1a1418" };
  switch (type) {
    case "self":    return { ...base, border: "2px solid rgba(200,170,80,0.9)" };
    case "ally":    return { ...base, border: "2px solid rgba(40,140,60,0.75)" };
    case "enemy":   return { ...base, border: "2px solid rgba(180,20,20,0.9)" };
    case "threat":  return { ...base, border: "2px solid rgba(140,20,160,0.75)" };
    case "faction": return { ...base, border: "2px solid rgba(60,80,200,0.75)" };
    default:        return { ...base, border: "2px solid rgba(160,150,150,0.55)" };
  }
}

function sceneSize(mode: "desktop" | "mobile") {
  return mode === "mobile"
    ? { width: 360, height: 680 }
    : { width: 920, height: 520 };
}

function toFlowNodes(
  sourceNodes: RelationshipNode[],
  mode: "desktop" | "mobile",
  prevFlowNodes?: Node[],
): Node[] {
  const scene = sceneSize(mode);

  return sourceNodes.map((node) => {
    const prev = prevFlowNodes?.find((p) => p.id === node.id);
    return {
      id: node.id,
      position: {
        x: (mode === "mobile" && node.mobileX !== undefined ? node.mobileX : node.x) * scene.width,
        y: (mode === "mobile" && node.mobileY !== undefined ? node.mobileY : node.y) * scene.height,
      },
      data: {
        label: (
          <div className={styles.flowNode}>
            <strong>{node.label}</strong>
            <span>{node.rel}</span>
          </div>
        ),
      },
      selected: prev?.selected ?? false,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        ...nodeTint(node.type),
        borderRadius: 14,
        padding: "10px 14px",
        width: 164,
        boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
        fontFamily: "var(--font-im-fell-english), serif",
      },
    };
  });
}

function toFlowEdges(sourceEdges: RelationshipEdge[]): Edge[] {
  return sourceEdges.map((edge) => ({
    id: edge.id,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    label: edge.label,
    animated: edge.style === "ominous",
    style:
      edge.style === "dashed"
        ? { strokeDasharray: "6 6", stroke: "rgba(240,236,232,0.45)", strokeWidth: 1.6 }
        : edge.style === "ominous"
          ? { strokeDasharray: "3 6", stroke: "rgba(180,20,20,0.9)", strokeWidth: 2.2 }
          : { stroke: "rgba(240,236,232,0.75)", strokeWidth: 1.8 },
    labelStyle: {
      fill: "#d4c8b0",
      fontFamily: "var(--font-cinzel), serif",
      fontSize: 11,
      letterSpacing: "0.06em",
    },
    labelBgStyle: { fill: "rgba(8,6,8,0.82)", stroke: "none" },
  }));
}

function buildPayload(
  sourceNodes: RelationshipNode[],
  sourceEdges: RelationshipEdge[],
  flowNodes: Node[],
  flowEdges: Edge[],
  mode: "desktop" | "mobile",
) {
  const scene = sceneSize(mode);

  const relationshipNodes = sourceNodes.map((node) => {
    const flowNode = flowNodes.find((candidate) => candidate.id === node.id);
    if (!flowNode) return node;

    const normalizedX = clamp(flowNode.position.x / scene.width, 0, 1);
    const normalizedY = clamp(flowNode.position.y / scene.height, 0, 1);

    return mode === "mobile"
      ? { ...node, mobileX: normalizedX, mobileY: normalizedY }
      : { ...node, x: normalizedX, y: normalizedY };
  });

  const relationshipEdges = flowEdges.map((edge) => {
    const existing = sourceEdges.find((candidate) => candidate.id === edge.id);
    return {
      id: edge.id,
      fromNodeId: edge.source,
      toNodeId: edge.target,
      style: existing?.style ?? "solid",
      label: typeof edge.label === "string" ? edge.label : existing?.label ?? "",
    } satisfies RelationshipEdge;
  });

  return { relationshipNodes, relationshipEdges };
}

/** Spread nodes in a circle so they never all start stacked at center */
function autoArrange(sourceNodes: RelationshipNode[]): RelationshipNode[] {
  if (sourceNodes.length === 0) return sourceNodes;

  const selfIndex = sourceNodes.findIndex((n) => n.type === "self");
  const centerIdx = selfIndex >= 0 ? selfIndex : 0;
  const others = sourceNodes.filter((_, i) => i !== centerIdx);
  const cx = 0.5;
  const cy = 0.5;
  const r = 0.36;

  return sourceNodes.map((node, i) => {
    if (i === centerIdx) {
      return { ...node, x: cx, y: cy, mobileX: cx, mobileY: cy };
    }
    const oi = others.indexOf(node);
    const angle = ((2 * Math.PI * oi) / Math.max(others.length, 1)) - Math.PI / 2;
    const x = clamp(cx + r * Math.cos(angle), 0.04, 0.96);
    const y = clamp(cy + r * Math.sin(angle), 0.04, 0.96);
    return { ...node, x, y, mobileX: x, mobileY: y };
  });
}

/** Pick a spread position for a new node that avoids center stacking */
function spreadPosition(existingCount: number) {
  const r = 0.36;
  const angle = ((2 * Math.PI * existingCount) / Math.max(existingCount + 1, 6)) - Math.PI / 2;
  return {
    x: clamp(0.5 + r * Math.cos(angle), 0.06, 0.94),
    y: clamp(0.5 + r * Math.sin(angle), 0.06, 0.94),
  };
}

export function MapEditor({ nodes, edges, onChange }: MapEditorProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [flowNodes, setFlowNodes] = useState<Node[]>(() => toFlowNodes(nodes, "desktop"));
  const [flowEdges, setFlowEdges] = useState<Edge[]>(() => toFlowEdges(edges));

  // Track whether a sidebar text field has focus — prevents ReactFlow's
  // onSelectionChange from clearing selectedNodeId while the user is typing.
  const fieldFocusedRef = useRef(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const nodeOptions = useMemo(
    () => nodes.map((node) => ({ id: node.id, label: node.label })),
    [nodes],
  );

  // Keep canvas in sync with prop changes (label edits etc.) while preserving selection
  useEffect(() => {
    if (fieldFocusedRef.current) return; // don't reset canvas while user is typing
    setFlowNodes((prev) => toFlowNodes(nodes, deviceMode, prev));
  }, [nodes, deviceMode]);

  function commit(nextFlowNodes: Node[], nextFlowEdges: Edge[], mode = deviceMode) {
    onChange(buildPayload(nodes, edges, nextFlowNodes, nextFlowEdges, mode));
  }

  function resetCanvas(
    mode: "desktop" | "mobile",
    nextNodes = nodes,
    nextEdges = edges,
  ) {
    setDeviceMode(mode);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    const newFlowNodes = toFlowNodes(nextNodes, mode);
    setFlowNodes(newFlowNodes);
    setFlowEdges(toFlowEdges(nextEdges));
  }

  function handleNodesChange(changes: NodeChange[]) {
    setFlowNodes((current) => {
      const next = applyNodeChanges(changes, current);
      const shouldCommit = changes.some(
        (change) =>
          change.type === "remove" ||
          (change.type === "position" && "dragging" in change && !change.dragging),
      );
      if (shouldCommit) {
        commit(next, flowEdges);
      }
      return next;
    });
  }

  function handleEdgesChange(changes: EdgeChange[]) {
    setFlowEdges((current) => {
      const next = applyEdgeChanges(changes, current);
      if (changes.some((change) => change.type === "remove")) {
        commit(flowNodes, next);
      }
      return next;
    });
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const next = addEdge(
      {
        id: uid(),
        source: connection.source,
        target: connection.target,
        label: "relates to",
      },
      flowEdges,
    );
    setFlowEdges(next);
    commit(flowNodes, next);
  }

  function addNode() {
    const pos = spreadPosition(nodes.length);
    const newNode: RelationshipNode = {
      id: uid(),
      type: "neutral",
      label: "New Node",
      rel: "Connection",
      tooltip: "Describe why this person, faction, or threat matters.",
      icon: "?",
      x: pos.x,
      y: pos.y,
      mobileX: pos.x,
      mobileY: pos.y,
    };
    const nextNodes = [...nodes, newNode];
    onChange({ relationshipNodes: nextNodes, relationshipEdges: edges });
    const newFlowNodes = toFlowNodes(nextNodes, deviceMode);
    setFlowNodes(newFlowNodes);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  }

  function handleAutoArrange() {
    const arranged = autoArrange(nodes);
    onChange({ relationshipNodes: arranged, relationshipEdges: edges });
    const newFlowNodes = toFlowNodes(arranged, deviceMode);
    setFlowNodes(newFlowNodes);
    setFlowEdges(toFlowEdges(edges));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }

  function deleteSelection() {
    if (selectedNodeId) {
      const nextNodes = nodes.filter((node) => node.id !== selectedNodeId);
      const nextEdges = edges.filter(
        (edge) => edge.fromNodeId !== selectedNodeId && edge.toNodeId !== selectedNodeId,
      );
      onChange({ relationshipNodes: nextNodes, relationshipEdges: nextEdges });
      setFlowNodes(toFlowNodes(nextNodes, deviceMode));
      setFlowEdges(toFlowEdges(nextEdges));
      setSelectedNodeId(null);
      return;
    }
    if (selectedEdgeId) {
      const nextEdges = edges.filter((edge) => edge.id !== selectedEdgeId);
      onChange({ relationshipNodes: nodes, relationshipEdges: nextEdges });
      setFlowEdges(toFlowEdges(nextEdges));
      setSelectedEdgeId(null);
    }
  }

  function updateNodeField<K extends keyof RelationshipNode>(
    field: K,
    value: RelationshipNode[K],
  ) {
    if (!selectedNodeId) return;
    const nextNodes = nodes.map((node) =>
      node.id === selectedNodeId ? { ...node, [field]: value } : node,
    );
    // Only call onChange — the useEffect above will sync flowNodes
    // while preserving selection via fieldFocusedRef guard
    onChange({ relationshipNodes: nextNodes, relationshipEdges: edges });
  }

  function updateEdgeField<K extends keyof RelationshipEdge>(
    field: K,
    value: RelationshipEdge[K],
  ) {
    if (!selectedEdgeId) return;
    const nextEdges = edges.map((edge) =>
      edge.id === selectedEdgeId ? { ...edge, [field]: value } : edge,
    );
    onChange({ relationshipNodes: nodes, relationshipEdges: nextEdges });
    setFlowEdges(toFlowEdges(nextEdges));
  }

  return (
    <section className={styles.shell}>
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={deviceMode === "desktop" ? styles.active : ""}
            onClick={() => resetCanvas("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={deviceMode === "mobile" ? styles.active : ""}
            onClick={() => resetCanvas("mobile")}
          >
            Mobile
          </button>
        </div>

        <div className={styles.toolbarActions}>
          <button type="button" onClick={addNode}>
            Add node
          </button>
          <button type="button" onClick={handleAutoArrange} disabled={nodes.length < 2}>
            Auto-arrange
          </button>
          <button
            type="button"
            onClick={deleteSelection}
            disabled={!selectedNodeId && !selectedEdgeId}
          >
            Delete
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.canvas}>
          <ReactFlowProvider>
            <ReactFlow
              key={deviceMode}
              nodes={flowNodes}
              edges={flowEdges}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onSelectionChange={({ nodes: pickedNodes, edges: pickedEdges }) => {
                // Don't steal selection while the user is typing in a sidebar field
                if (fieldFocusedRef.current) return;
                setSelectedNodeId(pickedNodes[0]?.id ?? null);
                setSelectedEdgeId(pickedEdges[0]?.id ?? null);
              }}
              onNodeClick={(_event, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_event, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={18} color="rgba(180,40,40,0.12)" />
              <MiniMap pannable zoomable style={{ background: "#14080e" }} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        <aside className={styles.sidebar}>
          {selectedNode ? (
            <div
              className={styles.editorCard}
              onFocusCapture={() => { fieldFocusedRef.current = true; }}
              onBlurCapture={() => { fieldFocusedRef.current = false; }}
            >
              <p className={styles.kicker}>Node</p>
              <h3>{selectedNode.label}</h3>

              <label>
                <span>Label</span>
                <input
                  value={selectedNode.label}
                  onChange={(event) => updateNodeField("label", event.target.value)}
                />
              </label>
              <label>
                <span>Relationship text</span>
                <input
                  value={selectedNode.rel}
                  onChange={(event) => updateNodeField("rel", event.target.value)}
                />
              </label>
              <label>
                <span>Type</span>
                <select
                  value={selectedNode.type}
                  onChange={(event) =>
                    updateNodeField("type", event.target.value as RelationshipNodeType)
                  }
                >
                  <option value="self">self</option>
                  <option value="ally">ally</option>
                  <option value="enemy">enemy</option>
                  <option value="neutral">neutral</option>
                  <option value="faction">faction</option>
                  <option value="threat">threat</option>
                </select>
              </label>
              <label>
                <span>Tooltip / description</span>
                <textarea
                  rows={4}
                  value={selectedNode.tooltip}
                  onChange={(event) => updateNodeField("tooltip", event.target.value)}
                />
              </label>
              <label>
                <span>Icon character</span>
                <input
                  value={selectedNode.icon ?? ""}
                  onChange={(event) => updateNodeField("icon", event.target.value)}
                />
              </label>
              <label>
                <span>Portrait URL</span>
                <input
                  value={selectedNode.assetSrc ?? ""}
                  onChange={(event) => updateNodeField("assetSrc", event.target.value)}
                />
              </label>
            </div>
          ) : selectedEdge ? (
            <div
              className={styles.editorCard}
              onFocusCapture={() => { fieldFocusedRef.current = true; }}
              onBlurCapture={() => { fieldFocusedRef.current = false; }}
            >
              <p className={styles.kicker}>Edge</p>
              <h3>Edit connection</h3>

              <label>
                <span>Label</span>
                <input
                  value={selectedEdge.label}
                  onChange={(event) => updateEdgeField("label", event.target.value)}
                />
              </label>
              <label>
                <span>Style</span>
                <select
                  value={selectedEdge.style}
                  onChange={(event) =>
                    updateEdgeField("style", event.target.value as RelationshipEdge["style"])
                  }
                >
                  <option value="solid">solid — known tie</option>
                  <option value="dashed">dashed — tenuous / uncertain</option>
                  <option value="ominous">ominous — threat / fate</option>
                </select>
              </label>
              <label>
                <span>From</span>
                <select
                  value={selectedEdge.fromNodeId}
                  onChange={(event) => updateEdgeField("fromNodeId", event.target.value)}
                >
                  {nodeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>To</span>
                <select
                  value={selectedEdge.toNodeId}
                  onChange={(event) => updateEdgeField("toNodeId", event.target.value)}
                >
                  {nodeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className={styles.editorCard}>
              <p className={styles.kicker}>Web of Fate</p>
              <h3>Click a node or edge to edit</h3>
              <p>
                Drag nodes to reposition. Connect nodes by dragging from a handle.
                Use Auto-arrange to spread a fresh layout into a circular web.
                Desktop and mobile layouts are stored separately.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
