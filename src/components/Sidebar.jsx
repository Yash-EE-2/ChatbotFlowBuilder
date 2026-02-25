/**
 * @file Sidebar.jsx
 * @description Left-side node palette panel for the Chatbot Flow Builder.
 *
 * The sidebar shows a curated list of node types that users can drag onto
 * the React Flow canvas to build their chatbot flow.
 *
 * Drawer behaviour
 * ────────────────
 * The sidebar can be collapsed (hidden) or expanded (visible) by clicking
 * the toggle button that sits on the panel's right edge.
 * Collapsed state:  sidebar slides off-screen (translateX(-100%)); a
 *                   floating "open drawer" tab remains visible so the user
 *                   can reopen it at any time.
 * Expanded state:   standard 240 px side panel.
 *
 * Drag-and-drop protocol
 * ──────────────────────
 * 1. `DraggableNode.onDragStart` writes the node type string (e.g. "textNode")
 *    into `event.dataTransfer` under the key "application/reactflow".
 * 2. When the user drops onto the canvas, `App.onDrop` reads that key and
 *    creates the corresponding node at the drop position.
 *
 * Adding a new node type
 * ──────────────────────
 * 1. Add an entry to NODE_TYPES below with `available: true`.
 * 2. Create the corresponding component (e.g. ImageNode.jsx).
 * 3. Register the component in App.jsx's nodeTypes useMemo.
 */

import React, { useState } from 'react';
import { MessageSquare, Image, Zap, HelpCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';


/* ─────────────────────────────────────────────────────────────────────────
   NODE_TYPES — the palette definition
   ─────────────────────────────────────
   Each entry describes one card in the sidebar.

   Fields:
     type        {string}    — must exactly match a key in App's nodeTypes map
     label       {string}    — human-readable name shown in the card
     description {string}    — one-line description shown beneath the label
     icon        {Component} — Lucide icon displayed in the coloured badge
     gradient    {string}    — Tailwind gradient classes for the icon badge bg
     available   {boolean}   — false = card is greyed-out with a "Soon" badge
                               and cannot be dragged
───────────────────────────────────────────────────────────────────────── */
const NODE_TYPES = [
    {
        type: 'textNode',
        label: 'Text Message',
        description: 'Send a text reply',
        icon: MessageSquare,
        gradient: 'from-brand-600 to-brand-500',
        available: true,   // ← fully implemented
    },
    {
        type: 'imageNode',
        label: 'Image',
        description: 'Send an image',
        icon: Image,
        gradient: 'from-sky-600 to-sky-500',
        available: false,  // ← coming soon
    },
    {
        type: 'conditionNode',
        label: 'Condition',
        description: 'Branch on a condition',
        icon: Zap,
        gradient: 'from-amber-600 to-amber-500',
        available: false,  // ← coming soon
    },
    {
        type: 'questionNode',
        label: 'Question',
        description: 'Ask the user a question',
        icon: HelpCircle,
        gradient: 'from-rose-600 to-rose-500',
        available: false,  // ← coming soon
    },
];


/* ─────────────────────────────────────────────────────────────────────────
   DraggableNode
   ─────────────
   Renders a single palette card. Draggable only when `available` is true.

   @param {object}   props
   @param {string}   props.type        — Node type identifier
   @param {string}   props.label       — Display name
   @param {string}   props.description — Short description
   @param {Component}props.icon        — Lucide icon component (aliased as `Icon`)
   @param {string}   props.gradient    — Tailwind gradient classes
   @param {boolean}  props.available   — Whether this node can be dragged
───────────────────────────────────────────────────────────────────────── */
function DraggableNode({ type, label, description, icon: Icon, gradient, available }) {

    const onDragStart = (event) => {
        if (!available) return;
        event.dataTransfer.setData('application/reactflow', type);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            draggable={available}
            onDragStart={onDragStart}
            title={available ? `Drag to add a ${label} node` : 'Coming soon'}
            className={`
                group relative flex items-center gap-3 p-3.5 rounded-xl border
                transition-all duration-200
                ${available
                    ? 'bg-[#1a1740] border-[#2d2b55] cursor-grab hover:border-brand-500 hover:shadow-node active:scale-95'
                    : 'bg-[#141230] border-[#1e1b4b] opacity-50 cursor-not-allowed'
                }
            `}
        >
            {/* Coloured icon badge */}
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className="text-white" />
            </div>

            {/* Text block */}
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 leading-tight">{label}</p>
                <p className="text-xs text-slate-500 truncate">{description}</p>
            </div>

            {/* "Soon" badge */}
            {!available && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-[#2d2b55] text-brand-300 px-1.5 py-0.5 rounded-full">
                    Soon
                </span>
            )}

            {/* "drag" hint on hover */}
            {available && (
                <span className="absolute right-3 text-[10px] font-medium text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    drag
                </span>
            )}
        </div>
    );
}


/* ─────────────────────────────────────────────────────────────────────────
   Sidebar — the exported component
   ──────────────────────────────────
   Wraps the panel in a relative container so the toggle tab can be
   absolutely positioned just outside the panel's right edge.

   @param {object} props
   @param {Set}    props.nodesWithOutgoing — Set of node IDs that already
                   have an outgoing edge.
───────────────────────────────────────────────────────────────────────── */
export default function Sidebar({ nodesWithOutgoing }) {
    const [open, setOpen] = useState(true);

    return (
        /* Outer positioning shell — does NOT shrink; the inner aside handles width */
        <div className="relative flex-shrink-0" style={{ zIndex: 20 }}>

            {/* ── Drawer panel ───────────────────────────────────────────── */}
            <aside
                style={{
                    width: '240px',
                    transform: open ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: open ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                }}
                className="bg-[#13112b] border-r border-[#2d2b55] flex flex-col overflow-hidden"
                aria-hidden={!open}
            >
                {/* Section heading */}
                <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400 mb-1">
                            Node Library
                        </p>
                        <p className="text-xs text-slate-500">Drag nodes onto the canvas</p>
                    </div>
                    {/* Collapse button inside the panel */}
                    <button
                        onClick={() => setOpen(false)}
                        title="Collapse sidebar"
                        aria-label="Collapse sidebar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#2d2b55] transition-colors flex-shrink-0"
                    >
                        <ChevronLeft size={15} />
                    </button>
                </div>

                {/* Horizontal rule */}
                <div className="mx-4 h-px bg-[#2d2b55]" />

                {/* Scrollable node palette */}
                <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5">
                    {NODE_TYPES.map((node) => (
                        <DraggableNode key={node.type} {...node} />
                    ))}
                </div>

                {/* Sticky footer tip */}
                <div className="px-4 py-3 border-t border-[#2d2b55] bg-[#0f0f1a]/50">
                    <p className="text-[11px] text-slate-600 leading-snug">
                        💡 Each node can have only <span className="text-brand-400 font-medium">one outgoing</span> connection.
                    </p>
                </div>
            </aside>

            {/* ── Floating open-tab (shown only when collapsed) ──────────── */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    title="Open Node Library"
                    aria-label="Open sidebar"
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 30,
                    }}
                    className="
                        flex flex-col items-center gap-1.5
                        px-1.5 py-4 rounded-r-xl
                        bg-[#13112b] border border-l-0 border-[#2d2b55]
                        text-brand-400 hover:text-white hover:bg-[#1e1b4b]
                        shadow-panel transition-all duration-200
                        group
                    "
                >
                    <Layers size={15} />
                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            )}
        </div>
    );
}
