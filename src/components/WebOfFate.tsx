"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DeviceMode, RelationshipEdge, RelationshipNode } from "@/lib/types";

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

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function WebOfFate({ nodes, edges, backgroundSrc }: WebOfFateProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchStateRef = useRef<{
    startDistance: number;
    startScale: number;
  } | null>(null);

  const [width, setWidth] = useState(0);
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(nodes[0]?.id ?? null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const stageWidth = Math.max(width - 2, 280);
  const stageHeight = isFullscreen
    ? window.innerHeight - 120
    : deviceMode === "mobile" ? 460 : deviceMode === "tablet" ? 390 : 340;
  const hideEdgeLabels = deviceMode === "mobile" || stageWidth < 640;

  const positionedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        left:
          (deviceMode === "mobile" && node.mobileX !== undefined ? node.mobileX : node.x) *
          stageWidth,
        top:
          (deviceMode === "mobile" && node.mobileY !== undefined ? node.mobileY : node.y) *
          stageHeight,
      })),
    [deviceMode, nodes, stageHeight, stageWidth],
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

  const activeNode =
    positionedNodes.find((node) => node.id === activeNodeId) ?? positionedNodes[0] ?? null;

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setTransform((current) => ({
      ...current,
      scale: clamp(current.scale - event.deltaY * 0.0012, 0.5, 3),
    }));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      panStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
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
      };
      panStateRef.current = null;
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchStateRef.current && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const currentDistance = distance(first, second);
      setTransform((current) => ({
        ...current,
        scale: clamp(
          pinchStateRef.current!.startScale *
            (currentDistance / pinchStateRef.current!.startDistance),
          0.5,
          3,
        ),
      }));
      return;
    }

    if (panStateRef.current) {
      const nextX = panStateRef.current.originX + (event.clientX - panStateRef.current.startX);
      const nextY = panStateRef.current.originY + (event.clientY - panStateRef.current.startY);
      setTransform((current) => ({ ...current, x: nextX, y: nextY }));
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchStateRef.current = null;
    if (pointersRef.current.size === 0) panStateRef.current = null;
  }

  function resetView() {
    setTransform({ x: 0, y: 0, scale: 1 });
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
          style={{ height: stageHeight }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
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
              width: stageWidth,
              height: stageHeight,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          >
            <svg
              className={styles.edges}
              viewBox={`0 0 ${stageWidth} ${stageHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="rgba(124,66,35,0.55)" />
                </marker>
              </defs>

              {positionedEdges.map((edge) => (
                <g key={edge.id}>
                  <line
                    x1={edge.from.left}
                    y1={edge.from.top}
                    x2={edge.to.left}
                    y2={edge.to.top}
                    className={`${styles.edge} ${styles[edge.style]}`}
                    markerEnd={edge.style === "solid" ? "url(#arrowhead)" : undefined}
                  />
                  {!hideEdgeLabels && edge.label ? (
                    <text x={edge.midpoint.x} y={edge.midpoint.y} className={styles.edgeLabel}>
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>

            {positionedNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`${styles.node} ${styles[node.type]} ${
                  node.id === activeNodeId ? styles.active : ""
                }`}
                style={{ left: node.left, top: node.top }}
                onClick={() => setActiveNodeId(node.id)}
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

      {isFullscreen ? (
        <div className={styles.fullscreenHint}>Esc or ⤡ to exit · Drag to pan · Scroll / pinch to zoom</div>
      ) : null}
    </section>
  );
}
