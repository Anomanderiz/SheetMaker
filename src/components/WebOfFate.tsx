"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DeviceMode, RelationshipEdge, RelationshipNode } from "@/lib/types";

import styles from "./WebOfFate.module.css";

interface WebOfFateProps {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  forcedDeviceMode?: DeviceMode;
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

export function WebOfFate({ nodes, edges, forcedDeviceMode }: WebOfFateProps) {
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

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  const deviceMode: DeviceMode =
    forcedDeviceMode ?? (width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop");
  const stageWidth = Math.max(width - 2, 280);
  const stageHeight =
    deviceMode === "mobile" ? 460 : deviceMode === "tablet" ? 390 : 340;
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

          if (!from || !to) {
            return null;
          }

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
      scale: clamp(current.scale - event.deltaY * 0.0012, 0.7, 2.4),
    }));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

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
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchStateRef.current && pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      const currentDistance = distance(first, second);
      setTransform((current) => ({
        ...current,
        scale: clamp(
          pinchStateRef.current!.startScale *
            (currentDistance / pinchStateRef.current!.startDistance),
          0.7,
          2.4,
        ),
      }));
      return;
    }

    if (panStateRef.current) {
      const nextX = panStateRef.current.originX + (event.clientX - panStateRef.current.startX);
      const nextY = panStateRef.current.originY + (event.clientY - panStateRef.current.startY);
      setTransform((current) => ({
        ...current,
        x: nextX,
        y: nextY,
      }));
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    if (pointersRef.current.size === 0) {
      panStateRef.current = null;
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Web of Fate</p>
          <h3>Relationships, pressure points, and unfinished bargains.</h3>
        </div>

        <div className={styles.actions}>
          <span>{deviceMode}</span>
          <button type="button" onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}>
            Reset view
          </button>
        </div>
      </div>

      <div className={styles.viewportWrap}>
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
              {positionedEdges.map((edge) => (
                <g key={edge.id}>
                  <line
                    x1={edge.from.left}
                    y1={edge.from.top}
                    x2={edge.to.left}
                    y2={edge.to.top}
                    className={`${styles.edge} ${styles[edge.style]}`}
                  />
                  {!hideEdgeLabels ? (
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
    </section>
  );
}
