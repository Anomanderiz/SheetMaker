"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DeviceMode, RelationshipEdge, RelationshipNode, RelationshipNodeType } from "@/lib/types";
import {
  getWebOfFateViewerSceneSize,
  WEB_OF_FATE_DESKTOP_VIEWPORT_HEIGHT,
  WEB_OF_FATE_MAX_SCALE,
  WEB_OF_FATE_MOBILE_VIEWPORT_HEIGHT,
  WEB_OF_FATE_TABLET_VIEWPORT_HEIGHT,
} from "@/lib/webOfFateScene";

import styles from "./WebOfFate.module.css";

interface WebOfFateProps {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  backgroundSrc?: string;
}

interface TransformState {
  x: number;
  y: number;
  scale: number;
}

interface LocalPoint {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: LocalPoint, b: LocalPoint): LocalPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

const NODE_TYPE_COLOR: Record<RelationshipNodeType, string> = {
  self:    "rgba(220, 200, 140, 0.8)",
  ally:    "rgba(40,  140,  60, 0.8)",
  enemy:   "rgba(180,  20,  20, 0.9)",
  neutral: "rgba(200, 192, 188, 0.5)",
  faction: "rgba(60,   80, 200, 0.8)",
  threat:  "rgba(160,  20, 160, 0.8)",
  mystery: "rgba(220, 200, 140, 0.8)",
};

const LEGEND_ENTRIES = [
  { label: "Ally",    color: "rgba(40,  140,  60, 0.85)" },
  { label: "Foe",     color: "rgba(180,  20,  20, 0.9)"  },
  { label: "Threat",  color: "rgba(160,  20, 160, 0.85)" },
  { label: "Faction", color: "rgba(60,   80, 200, 0.85)" },
  { label: "Neutral", color: "rgba(200, 192, 188, 0.6)"  },
  { label: "Mystery", color: "rgba(220, 200, 140, 0.85)" },
] as const;

function edgeColor(fromType: RelationshipNodeType, toType: RelationshipNodeType): string {
  return NODE_TYPE_COLOR[toType === "self" ? fromType : toType];
}

export function WebOfFate({ nodes, edges, backgroundSrc }: WebOfFateProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, LocalPoint>());
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchStateRef = useRef<{
    startDistance: number;
    startScale: number;
    startMidpoint: LocalPoint;
    originX: number;
    originY: number;
  } | null>(null);

  const [width, setWidth] = useState(0);
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    const updateWindowHeight = () => setWindowHeight(window.innerHeight);
    updateWindowHeight();
    window.addEventListener("resize", updateWindowHeight);
    return () => window.removeEventListener("resize", updateWindowHeight);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  const deviceMode: DeviceMode =
    width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  const viewportWidth = Math.max(width - 2, 280);
  const viewportHeight = isFullscreen
    ? Math.max(windowHeight - 80, 320)
    : deviceMode === "mobile"
      ? WEB_OF_FATE_MOBILE_VIEWPORT_HEIGHT
      : deviceMode === "tablet"
        ? WEB_OF_FATE_TABLET_VIEWPORT_HEIGHT
        : WEB_OF_FATE_DESKTOP_VIEWPORT_HEIGHT;
  const scene = getWebOfFateViewerSceneSize(deviceMode, viewportWidth, viewportHeight);
  const fitScale = Math.min(viewportWidth / scene.width, viewportHeight / scene.height);
  const minScale = Math.min(0.5, Math.max(0.35, fitScale * 0.92));
  const hideEdgeLabels = deviceMode === "mobile" || scene.width < 640;

  const positionedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        left:
          (deviceMode === "mobile" && node.mobileX !== undefined ? node.mobileX : node.x) *
          scene.width,
        top:
          (deviceMode === "mobile" && node.mobileY !== undefined ? node.mobileY : node.y) *
          scene.height,
      })),
    [deviceMode, nodes, scene.height, scene.width],
  );

  const defaultTransform = useMemo<TransformState>(() => {
    if (positionedNodes.length === 0) {
      return { x: 0, y: 0, scale: 1 };
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const node of positionedNodes) {
      minX = Math.min(minX, node.left);
      maxX = Math.max(maxX, node.left);
      minY = Math.min(minY, node.top);
      maxY = Math.max(maxY, node.top);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return {
      x: viewportWidth / 2 - centerX,
      y: viewportHeight / 2 - centerY,
      scale: 1,
    };
  }, [positionedNodes, viewportHeight, viewportWidth]);

  useEffect(() => {
    setTransform(defaultTransform);
  }, [defaultTransform]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      setTransform((current) => {
        const nextScale = clamp(current.scale - e.deltaY * 0.0012, minScale, WEB_OF_FATE_MAX_SCALE);
        if (nextScale === current.scale) return current;

        const sceneX = (anchor.x - current.x) / current.scale;
        const sceneY = (anchor.y - current.y) / current.scale;

        return {
          x: anchor.x - sceneX * nextScale,
          y: anchor.y - sceneY * nextScale,
          scale: nextScale,
        };
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minScale]);

  const positionedEdges = useMemo(
    () =>
      edges
        .map((edge) => {
          const from = positionedNodes.find((node) => node.id === edge.fromNodeId);
          const to = positionedNodes.find((node) => node.id === edge.toNodeId);
          if (!from || !to) return null;
          return {
            ...edge,
            from,
            to,
            midpoint: {
              x: (from.left + to.left) / 2,
              y: (from.top + to.top) / 2,
            },
          };
        })
        .filter(Boolean),
    [edges, positionedNodes],
  ) as Array<
    RelationshipEdge & {
      from: (typeof positionedNodes)[number];
      to: (typeof positionedNodes)[number];
      midpoint: { x: number; y: number };
    }
  >;

  const activeNode =
    positionedNodes.find((node) => node.id === activeNodeId) ?? positionedNodes[0] ?? null;

  const connectedEdgeIds = useMemo(
    () =>
      activeNodeId
        ? new Set(
            positionedEdges
              .filter((e) => e.fromNodeId === activeNodeId || e.toNodeId === activeNodeId)
              .map((e) => e.id),
          )
        : null,
    [activeNodeId, positionedEdges],
  );

  function localPoint(event: React.PointerEvent<HTMLDivElement>): LocalPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const point = localPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, point);
    if (pointersRef.current.size === 1) {
      panStateRef.current = {
        startX: point.x,
        startY: point.y,
        originX: transform.x,
        originY: transform.y,
      };
      pinchStateRef.current = null;
    }
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchStateRef.current = {
        startDistance: distance(first, second),
        startScale: transform.scale,
        startMidpoint: midpoint(first, second),
        originX: transform.x,
        originY: transform.y,
      };
      panStateRef.current = null;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);

    if (pinchStateRef.current && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const currentDistance = distance(first, second);
      const currentMidpoint = midpoint(first, second);
      const nextScale = clamp(
        pinchStateRef.current.startScale *
          (currentDistance / Math.max(pinchStateRef.current.startDistance, 1)),
        minScale,
        WEB_OF_FATE_MAX_SCALE,
      );
      const sceneX =
        (pinchStateRef.current.startMidpoint.x - pinchStateRef.current.originX) /
        pinchStateRef.current.startScale;
      const sceneY =
        (pinchStateRef.current.startMidpoint.y - pinchStateRef.current.originY) /
        pinchStateRef.current.startScale;

      setTransform({
        x: currentMidpoint.x - sceneX * nextScale,
        y: currentMidpoint.y - sceneY * nextScale,
        scale: nextScale,
      });
      return;
    }

    if (panStateRef.current) {
      const nextX = panStateRef.current.originX + (point.x - panStateRef.current.startX);
      const nextY = panStateRef.current.originY + (point.y - panStateRef.current.startY);
      setTransform((current) => ({ ...current, x: nextX, y: nextY }));
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchStateRef.current = null;
    if (pointersRef.current.size === 1) {
      const [remaining] = [...pointersRef.current.values()];
      panStateRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        originX: transform.x,
        originY: transform.y,
      };
      return;
    }

    panStateRef.current = null;
  }

  function resetView() {
    setTransform(defaultTransform);
  }

  if (nodes.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Web of Fate</p>
            <h3>No relationships mapped yet.</h3>
          </div>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>✦</span>
          <p>Open the Map tab in the editor to add nodes and draw connections.</p>
        </div>
      </section>
    );
  }

  const sectionClass = isFullscreen
    ? `${styles.section} ${styles.fullscreenSection}`
    : styles.section;

  return (
    <section className={sectionClass}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Web of Fate</p>
          <h3>Relationships, pressure points, and unfinished bargains.</h3>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={resetView}>
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              resetView();
              setIsFullscreen((v) => !v);
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Expand fullscreen"}
          >
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        </div>
      </div>

      <div className={`${styles.viewportWrap} ${!isFullscreen && deviceMode !== "desktop" ? styles.viewportWrapConstrained : ""}`}>
        <div
          ref={hostRef}
          className={styles.viewport}
          style={{ height: viewportHeight }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClick={() => setActiveNodeId(null)}
        >
          {backgroundSrc ? (
            <div
              className={styles.bgLayer}
              style={{ backgroundImage: `url(${backgroundSrc})` }}
              aria-hidden="true"
            />
          ) : null}
          <div
            className={styles.scene}
            style={{
              width: scene.width,
              height: scene.height,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          >
            <svg
              className={styles.edges}
              viewBox={`0 0 ${scene.width} ${scene.height}`}
              preserveAspectRatio="none"
            >
              <defs>
                {(Object.entries(NODE_TYPE_COLOR) as [RelationshipNodeType, string][]).map(
                  ([type, color]) => (
                    <marker
                      key={type}
                      id={`arrow-${type}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L0,6 L8,3 z" fill={color} />
                    </marker>
                  ),
                )}
                {positionedEdges
                  .filter((e) => e.color && e.style === "solid")
                  .map((e) => (
                    <marker
                      key={`arrow-c-${e.id}`}
                      id={`arrow-c-${e.id}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L0,6 L8,3 z" fill={e.color} />
                    </marker>
                  ))}
              </defs>

              {positionedEdges.map((edge) => {
                const effectiveType: RelationshipNodeType =
                  edge.to.type === "self" ? edge.from.type : edge.to.type;
                const color = edge.color ?? edgeColor(edge.from.type, edge.to.type);
                const markerId = edge.color
                  ? `arrow-c-${edge.id}`
                  : `arrow-${effectiveType}`;
                const edgeState = connectedEdgeIds
                  ? connectedEdgeIds.has(edge.id)
                    ? styles.edgeGroupHighlighted
                    : styles.edgeGroupDimmed
                  : "";
                return (
                  <g key={edge.id} className={edgeState}>
                    <line
                      x1={edge.from.left}
                      y1={edge.from.top}
                      x2={edge.to.left}
                      y2={edge.to.top}
                      className={`${styles.edge} ${styles[edge.style]}`}
                      stroke={color}
                      markerEnd={edge.style === "solid" ? `url(#${markerId})` : undefined}
                    />
                    {!hideEdgeLabels && edge.label ? (
                      <text
                        x={edge.midpoint.x}
                        y={edge.midpoint.y}
                        className={styles.edgeLabel}
                        fill={color}
                      >
                        {edge.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {positionedNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`${styles.node} ${styles[node.type]} ${
                  node.id === activeNodeId ? styles.active : ""
                }`}
                style={{ left: node.left, top: node.top }}
                onClick={(e) => { e.stopPropagation(); setActiveNodeId(node.id); }}
              >
                {node.assetSrc ? (
                  <span
                    className={styles.nodePortrait}
                    style={{ backgroundImage: `url(${node.assetSrc})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <span className={styles.nodeIcon}>{node.icon ?? node.label.slice(0, 1)}</span>
                )}
                <span className={styles.nodeText}>
                  <strong>{node.label}</strong>
                  <span>{node.rel}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeNode ? (
        <div className={styles.details}>
          <p className={styles.detailLabel}>{activeNode.rel}</p>
          <h4>{activeNode.label}</h4>
          <p>{activeNode.tooltip}</p>
        </div>
      ) : null}

      <div className={styles.legend} aria-label="Relationship legend">
        {LEGEND_ENTRIES.map((entry) => (
          <span key={entry.label} className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: entry.color }} aria-hidden="true" />
            {entry.label}
          </span>
        ))}
      </div>

      {isFullscreen ? (
        <div className={styles.fullscreenHint}>Esc or ⤡ to exit · Drag to pan · Scroll / pinch to zoom</div>
      ) : null}
    </section>
  );
}
