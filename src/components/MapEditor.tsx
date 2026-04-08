"use client";

import { useMemo, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
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

function nodeTint(type: RelationshipNodeType) {
  switch (type) {
    case "self":
      return { background: "#f4d684", color: "#341707" };
    case "ally":
      return { background: "#c8e2c8", color: "#10331f" };
    case "enemy":
      return { background: "#ecc0ba", color: "#4c120c" };
    case "threat":
      return { background: "#d7b0b7", color: "#4d0d13" };
    case "faction":
      return { background: "#d6cef0", color: "#27133d" };
    default:
      return { background: "#efe3ca", color: "#3f2617" };
  }
}

function sceneSize(mode: "desktop" | "mobile") {
  return mode === "mobile"
    ? { width: 360, height: 680 }
    : { width: 920, height: 520 };
}

function toFlowNodes(sourceNodes: RelationshipNode[], mode: "desktop" | "mobile"): Node[] {
  const scene = sceneSize(mode);

  return sourceNodes.map((node) => ({
    id: node.id,
    position: {
      x: (mode === "mobile" && node.mobileX !== undefined ? node.mobileX : node.x) * scene.width,
      y: (mode === "mobile" && node.mobileY !== undefined ? node.mobileY : node.y) * scene.height,
    },
    data: {
      label: node.label,
      rel: node.rel,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: {
      ...nodeTint(node.type),
      border: "1px solid rgba(52, 23, 7, 0.2)",
      borderRadius: 18,
      padding: 10,
      width: 152,
      fontFamily: "var(--font-cinzel), serif",
      boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
    },
  }));
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
        ? { strokeDasharray: "6 6", stroke: "#493f86" }
        : edge.style === "ominous"
          ? { strokeDasharray: "2 8", stroke: "#7c1f1f" }
          : { stroke: "#6f472c" },
    labelStyle: {
      fill: "#4b2713",
      fontFamily: "var(--font-cinzel), serif",
      fontSize: 12,
    },
  }));
}

export function MapEditor({ nodes, edges, onChange }: MapEditorProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const flowNodes = useMemo(() => toFlowNodes(nodes, deviceMode), [deviceMode, nodes]);
  const flowEdges = useMemo(() => toFlowEdges(edges), [edges]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const nodeOptions = useMemo(
    () => nodes.map((node) => ({ id: node.id, label: node.label })),
    [nodes],
  );

  function syncToParent(nextFlowNodes: Node[], nextFlowEdges: Edge[]) {
    const scene = sceneSize(deviceMode);

    const nextRelationshipNodes = nodes.map((node) => {
      const flowNode = nextFlowNodes.find((candidate) => candidate.id === node.id);
      if (!flowNode) {
        return node;
      }

      const normalizedX = Math.min(Math.max(flowNode.position.x / scene.width, 0), 1);
      const normalizedY = Math.min(Math.max(flowNode.position.y / scene.height, 0), 1);

      return deviceMode === "mobile"
        ? { ...node, mobileX: normalizedX, mobileY: normalizedY }
        : { ...node, x: normalizedX, y: normalizedY };
    });

    const nextRelationshipEdges = nextFlowEdges.map((edge) => {
      const existing = edges.find((candidate) => candidate.id === edge.id);
      return {
        id: edge.id,
        fromNodeId: edge.source,
        toNodeId: edge.target,
        style: existing?.style ?? "solid",
        label: typeof edge.label === "string" ? edge.label : existing?.label ?? "",
      } satisfies RelationshipEdge;
    });

    onChange({
      relationshipNodes: nextRelationshipNodes,
      relationshipEdges: nextRelationshipEdges,
    });
  }

  function handleNodesChange(changes: NodeChange[]) {
    const next = applyNodeChanges(changes, flowNodes);
    syncToParent(next, flowEdges);
  }

  function handleEdgesChange(changes: EdgeChange[]) {
    const next = applyEdgeChanges(changes, flowEdges);
    syncToParent(flowNodes, next);
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }

    const next = addEdge(
      {
        id: uid(),
        source: connection.source,
        target: connection.target,
        label: "new tie",
      },
      flowEdges,
    );
    syncToParent(flowNodes, next);
  }

  function addNode() {
    const newNode: RelationshipNode = {
      id: uid(),
      type: "neutral",
      label: "New Node",
      rel: "Connection",
      tooltip: "Describe why this person, faction, or threat matters.",
      icon: "?",
      x: 0.5,
      y: 0.5,
      mobileX: 0.5,
      mobileY: 0.5,
    };

    onChange({
      relationshipNodes: [...nodes, newNode],
      relationshipEdges: edges,
    });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  }

  function deleteSelection() {
    if (selectedNodeId) {
      onChange({
        relationshipNodes: nodes.filter((node) => node.id !== selectedNodeId),
        relationshipEdges: edges.filter(
          (edge) => edge.fromNodeId !== selectedNodeId && edge.toNodeId !== selectedNodeId,
        ),
      });
      setSelectedNodeId(null);
      return;
    }

    if (selectedEdgeId) {
      onChange({
        relationshipNodes: nodes,
        relationshipEdges: edges.filter((edge) => edge.id !== selectedEdgeId),
      });
      setSelectedEdgeId(null);
    }
  }

  function updateNodeField<K extends keyof RelationshipNode>(
    field: K,
    value: RelationshipNode[K],
  ) {
    if (!selectedNodeId) {
      return;
    }

    onChange({
      relationshipNodes: nodes.map((node) =>
        node.id === selectedNodeId ? { ...node, [field]: value } : node,
      ),
      relationshipEdges: edges,
    });
  }

  function updateEdgeField<K extends keyof RelationshipEdge>(
    field: K,
    value: RelationshipEdge[K],
  ) {
    if (!selectedEdgeId) {
      return;
    }

    onChange({
      relationshipNodes: nodes,
      relationshipEdges: edges.map((edge) =>
        edge.id === selectedEdgeId ? { ...edge, [field]: value } : edge,
      ),
    });
  }

  return (
    <section className={styles.shell}>
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={deviceMode === "desktop" ? styles.active : ""}
            onClick={() => setDeviceMode("desktop")}
          >
            Desktop layout
          </button>
          <button
            type="button"
            className={deviceMode === "mobile" ? styles.active : ""}
            onClick={() => setDeviceMode("mobile")}
          >
            Mobile layout
          </button>
        </div>

        <div className={styles.toolbarActions}>
          <button type="button" onClick={addNode}>
            Add node
          </button>
          <button type="button" onClick={deleteSelection}>
            Delete selected
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.canvas}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={({ nodes: pickedNodes, edges: pickedEdges }) => {
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
            <Background gap={18} color="#cdb995" />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>

        <aside className={styles.sidebar}>
          {selectedNode ? (
            <div className={styles.editorCard}>
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
                <span>Tooltip</span>
                <textarea
                  rows={5}
                  value={selectedNode.tooltip}
                  onChange={(event) => updateNodeField("tooltip", event.target.value)}
                />
              </label>
              <label>
                <span>Icon</span>
                <input
                  value={selectedNode.icon ?? ""}
                  onChange={(event) => updateNodeField("icon", event.target.value)}
                />
              </label>
              <label>
                <span>Portrait URL or data URL</span>
                <input
                  value={selectedNode.assetSrc ?? ""}
                  onChange={(event) => updateNodeField("assetSrc", event.target.value)}
                />
              </label>
            </div>
          ) : selectedEdge ? (
            <div className={styles.editorCard}>
              <p className={styles.kicker}>Edge</p>
              <h3>Edit relationship</h3>

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
                    updateEdgeField(
                      "style",
                      event.target.value as RelationshipEdge["style"],
                    )
                  }
                >
                  <option value="solid">solid</option>
                  <option value="dashed">dashed</option>
                  <option value="ominous">ominous</option>
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
              <p className={styles.kicker}>Map Editor</p>
              <h3>Select a node or edge.</h3>
              <p>
                Desktop and mobile positions are edited separately, so you can
                keep the public handout legible on phones without compromising
                the desktop layout.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
