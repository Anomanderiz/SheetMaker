"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  DeviceMode,
  RelationshipEdge,
  RelationshipNode,
  RelationshipNodeType,
} from "@/lib/types";
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

interface NodeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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

function getNodeBounds(
  graphNodes: Array<{ left: number; top: number }>,
  padding: number,
): NodeBounds | null {
  if (graphNodes.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of graphNodes) {
    minX = Math.min(minX, node.left);
    maxX = Math.max(maxX, node.left);
    minY = Math.min(minY, node.top);
    maxY = Math.max(maxY, node.top);
  }

  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  };
}

function getCenteredTransform(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  anchorYRatio = 0.5,
): TransformState {
  return {
    x: viewportWidth / 2 - x * scale,
    y: viewportHeight * anchorYRatio - y * scale,
    scale,
  };
}

function getFitTransform(
  bounds: NodeBounds | null,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
): TransformState {
  if (!bounds) {
    return { x: 0, y: 0, scale: 1 };
  }

  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = clamp(
    Math.min(viewportWidth / width, viewportHeight / height),
    minScale,
    1,
  );

  return getCenteredTransform(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    viewportWidth,
    viewportHeight,
    scale,
  );
}

const NODE_TYPE_COLOR: Record<RelationshipNodeType, string> = {
  self: "rgba(220, 200, 140, 0.8)",
  ally: "rgba(40, 140, 60, 0.8)",
  enemy: "rgba(180, 20, 20, 0.9)",
  neutral: "rgba(200, 192, 188, 0.5)",
  faction: "rgba(60, 80, 200, 0.8)",
  threat: "rgba(160, 20, 160, 0.8)",
  mystery: "rgba(220, 200, 140, 0.8)",
};

const LEGEND_ENTRIES = [
  { label: "Ally", color: "rgba(40, 140, 60, 0.85)" },
  { label: "Foe", color: "rgba(180, 20, 20, 0.9)" },
  { label: "Threat", color: "rgba(160, 20, 160, 0.85)" },
  { label: "Faction", color: "rgba(60, 80, 200, 0.85)" },
  { label: "Neutral", color: "rgba(200, 192, 188, 0.6)" },
  { label: "Mystery", color: "rgba(220, 200, 140, 0.85)" },
] as const;

function edgeColor(fromType: RelationshipNodeType, toType: RelationshipNodeType): string {
  return NODE_TYPE_COLOR[toType === "self" ? fromType : toType];
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {expanded ? (
        <>
          <path d="M6 3H3v3" />
          <path d="M12 3h3v3" />
          <path d="M3 12v3h3" />
          <path d="M15 12v3h-3" />
          <path d="M3 3l4 4" />
          <path d="M15 3l-4 4" />
          <path d="M3 15l4-4" />
          <path d="M15 15l-4-4" />
        </>
      ) : (
        <>
          <path d="M7 7H3V3" />
          <path d="M11 7h4V3" />
          <path d="M7 11H3v4" />
          <path d="M11 11h4v4" />
          <path d="M3 3l5 5" />
          <path d="M15 3l-5 5" />
          <path d="M3 15l5-5" />
          <path d="M15 15l-5-5" />
        </>
      )}
    </svg>
  );
}

export function WebOfFate({ nodes, edges, backgroundSrc }: WebOfFateProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, LocalPoint>());
  const suppressClickRef = useRef(false);
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

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const deviceMode: DeviceMode =
    width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
  const viewportWidth = Math.max(width - 2, 280);
  const viewportHeight = isFullscreen
    ? deviceMode === "mobile"
      ? Math.max(Math.round(windowHeight * 1.35), 940)
      : Math.max(windowHeight - 80, 320)
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

  const defaultNodeId = nodes.find((node) => node.type === "self")?.id ?? nodes[0]?.id ?? null;
  const selectedNodeId = activeNodeId ?? (deviceMode === "mobile" ? defaultNodeId : null);
  const selectedNode = selectedNodeId
    ? positionedNodes.find((node) => node.id === selectedNodeId) ?? null
    : null;
  const detailNode = selectedNode ?? (deviceMode === "mobile" ? null : positionedNodes[0] ?? null);
  const nodeBounds = useMemo(
    () => getNodeBounds(positionedNodes, deviceMode === "mobile" ? 90 : 96),
    [deviceMode, positionedNodes],
  );
  const desktopDefaultTransform = useMemo(
    () =>
      nodeBounds
        ? getCenteredTransform(
            (nodeBounds.minX + nodeBounds.maxX) / 2,
            (nodeBounds.minY + nodeBounds.maxY) / 2,
            viewportWidth,
            viewportHeight,
            1,
          )
        : { x: 0, y: 0, scale: 1 },
    [nodeBounds, viewportHeight, viewportWidth],
  );
  const overviewTransform = useMemo(
    () => getFitTransform(nodeBounds, viewportWidth, viewportHeight, minScale),
    [minScale, nodeBounds, viewportHeight, viewportWidth],
  );
  const preferredTransform = desktopDefaultTransform;

  useEffect(() => {
    setTransform(preferredTransform);
  }, [preferredTransform]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      setTransform((current) => {
        const nextScale = clamp(
          current.scale - event.deltaY * 0.0012,
          minScale,
          WEB_OF_FATE_MAX_SCALE,
        );
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

  const connectedEdgeIds = useMemo(
    () =>
      selectedNodeId
        ? new Set(
            positionedEdges
              .filter((edge) => edge.fromNodeId === selectedNodeId || edge.toNodeId === selectedNodeId)
              .map((edge) => edge.id),
          )
        : null,
    [positionedEdges, selectedNodeId],
  );

  const connectedNodeIds = useMemo(
    () =>
      selectedNodeId
        ? new Set(
            positionedEdges
              .flatMap((edge) =>
                edge.fromNodeId === selectedNodeId || edge.toNodeId === selectedNodeId
                  ? [edge.fromNodeId, edge.toNodeId]
                  : [],
              )
              .concat(selectedNodeId),
          )
        : null,
    [positionedEdges, selectedNodeId],
  );

  const showFocusContext =
    deviceMode === "mobile" &&
    !!selectedNodeId &&
    transform.scale > overviewTransform.scale + 0.08;

  function localPoint(event: React.PointerEvent<HTMLDivElement>): LocalPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function consumeSuppressedClick() {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const point = localPoint(event);
    if (pointersRef.current.size === 0) {
      suppressClickRef.current = false;
    }
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
      suppressClickRef.current = true;
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
      if (
        Math.abs(point.x - panStateRef.current.startX) > 4 ||
        Math.abs(point.y - panStateRef.current.startY) > 4
      ) {
        suppressClickRef.current = true;
      }
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
    setTransform(preferredTransform);
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
          <span className={styles.emptyIcon}>*</span>
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
              setIsFullscreen((value) => !value);
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Expand fullscreen"}
          >
            <ExpandIcon expanded={isFullscreen} />
          </button>
        </div>
      </div>

      <div
        className={`${styles.viewportWrap} ${
          !isFullscreen && deviceMode !== "desktop" ? styles.viewportWrapConstrained : ""
        }`}
      >
        <div
          ref={hostRef}
          className={styles.viewport}
          style={{ height: viewportHeight }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onClick={() => {
            if (consumeSuppressedClick()) return;
            setActiveNodeId(null);
          }}
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
                  .filter((edge) => edge.color && edge.style === "solid")
                  .map((edge) => (
                    <marker
                      key={`arrow-c-${edge.id}`}
                      id={`arrow-c-${edge.id}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="3"
                      orient="auto"
                    >
                      <path d="M0,0 L0,6 L8,3 z" fill={edge.color} />
                    </marker>
                  ))}
              </defs>

              {positionedEdges.map((edge) => {
                const effectiveType: RelationshipNodeType =
                  edge.to.type === "self" ? edge.from.type : edge.to.type;
                const color = edge.color ?? edgeColor(edge.from.type, edge.to.type);
                const markerId = edge.color ? `arrow-c-${edge.id}` : `arrow-${effectiveType}`;
                const edgeState = showFocusContext && connectedEdgeIds
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

            {positionedNodes.map((node) => {
              const nodeState = showFocusContext && connectedNodeIds
                ? connectedNodeIds.has(node.id)
                  ? styles.nodeHighlighted
                  : styles.nodeDimmed
                : "";

              return (
                <button
                  key={node.id}
                  type="button"
                  className={`${styles.node} ${styles[node.type]} ${
                    node.id === selectedNodeId ? styles.active : ""
                  } ${nodeState}`}
                  style={{ left: node.left, top: node.top }}
                  onClick={(event) => {
                    if (consumeSuppressedClick()) {
                      event.stopPropagation();
                      return;
                    }
                    event.stopPropagation();
                    setActiveNodeId(node.id);
                  }}
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
              );
            })}
          </div>
        </div>

        {deviceMode === "mobile" ? (
          <div className={styles.mobileHud}>
            <div className={styles.mobileJumpRail} aria-label="Focus nodes">
              <button
                type="button"
                className={styles.mobileJumpUtility}
                onClick={() => setTransform(overviewTransform)}
              >
                Overview
              </button>

              {positionedNodes.map((node) => (
                <button
                  key={`jump-${node.id}`}
                  type="button"
                  className={`${styles.mobileJumpButton} ${
                    node.id === selectedNodeId ? styles.mobileJumpButtonActive : ""
                  }`}
                  style={{ "--mobile-accent": NODE_TYPE_COLOR[node.type] } as React.CSSProperties}
                  onClick={() => setActiveNodeId(node.id)}
                >
                  <span className={styles.mobileJumpDot} aria-hidden="true" />
                  {node.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {detailNode ? (
        <div className={styles.details}>
          <p className={styles.detailLabel}>{detailNode.rel}</p>
          <h4>{detailNode.label}</h4>
          <p>{detailNode.tooltip}</p>
        </div>
      ) : null}

      <div className={styles.legend} aria-label="Relationship legend">
        {LEGEND_ENTRIES.map((entry) => (
          <span key={entry.label} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            {entry.label}
          </span>
        ))}
      </div>

      {isFullscreen && deviceMode !== "mobile" ? (
        <div className={styles.fullscreenHint}>
          Esc or close to exit | Drag to pan | Scroll / pinch to zoom
        </div>
      ) : null}
    </section>
  );
}
