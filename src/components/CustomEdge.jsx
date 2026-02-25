/**
 * @file CustomEdge.jsx
 * @description A custom React Flow edge that visually hints the user
 *   to double-click in order to remove the connection.
 *
 *   On hover OR click the edge shows a small pill-shaped label
 *   at the midpoint of the bezier path: "✕ Double-click to remove".
 *   Double-clicking the edge (or its label) fires onEdgeDoubleClick
 *   which is handled in App.jsx to delete the edge.
 */

import React, { useState } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    MarkerType,
} from 'reactflow';

/**
 * CustomEdge — drop-in replacement for React Flow's default edge.
 *
 * Props are injected automatically by React Flow when a node type is
 * registered in the `edgeTypes` map.
 *
 * @param {object} props - Standard React Flow edge props.
 */
export default function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
}) {
    const [hovered, setHovered] = useState(false);

    // Compute the SVG path and the exact midpoint for label placement
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const showLabel = hovered || selected;

    return (
        <>
            {/*
                Invisible wide stroke on top of the visible edge so the
                hover target is easier to hit — thin SVG lines are hard
                to mouse-over precisely.
            */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ cursor: 'pointer' }}
            />

            {/* The visible styled edge line */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: selected ? '#a5b4fc' : (hovered ? '#c4b5fd' : '#818cf8'),
                    strokeWidth: hovered || selected ? 2.5 : 2,
                    transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
                }}
            />

            {/* Tooltip label rendered in HTML (not SVG) via EdgeLabelRenderer */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        // Only visible on hover or selection
                        opacity: showLabel ? 1 : 0,
                        transition: 'opacity 0.18s ease',
                    }}
                    className="nodrag nopan"
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: 'rgba(30, 27, 75, 0.92)',
                            border: '1px solid rgba(99, 102, 241, 0.5)',
                            color: '#c4b5fd',
                            fontSize: '11px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            userSelect: 'none',
                            backdropFilter: 'blur(4px)',
                            cursor: 'pointer',
                        }}
                    >
                        ✕ Double-click to remove
                    </span>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
