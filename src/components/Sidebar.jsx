/**
 * @file Sidebar.jsx
 * @description Left-side node palette panel for the Chatbot Flow Builder.
 *
 * The sidebar shows a curated list of node types that users can drag onto
 * the React Flow canvas to build their chatbot flow.
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

import React from 'react';
import { MessageSquare, Image, Zap, HelpCircle } from 'lucide-react';


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

   The drag-start handler sets two dataTransfer properties:
     • 'application/reactflow' → the node type string (read by App.onDrop)
     • effectAllowed → 'move'  → tells the OS to show a move cursor

   Unavailable nodes are rendered with `draggable={false}` and a "Soon"
   badge — they are purely decorative placeholders showing the product roadmap.

   @param {object}   props
   @param {string}   props.type        — Node type identifier
   @param {string}   props.label       — Display name
   @param {string}   props.description — Short description
   @param {Component}props.icon        — Lucide icon component (aliased as `Icon`)
   @param {string}   props.gradient    — Tailwind gradient classes
   @param {boolean}  props.available   — Whether this node can be dragged
───────────────────────────────────────────────────────────────────────── */
function DraggableNode({ type, label, description, icon: Icon, gradient, available }) {

    /**
     * Sets drag data so App.onDrop knows what kind of node to create.
     * Returning early when !available prevents drag on disabled cards
     * even if the user somehow bypasses the draggable={false} attribute.
     *
     * @param {React.DragEvent} event
     */
    const onDragStart = (event) => {
        if (!available) return;
        // Store the node type string — App.onDrop reads this
        event.dataTransfer.setData('application/reactflow', type);
        // Signal the OS that this is a move operation (not copy)
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            draggable={available}        /* false = OS drag system is disabled */
            onDragStart={onDragStart}
            title={available ? `Drag to add a ${label} node` : 'Coming soon'}
            className={`
                group relative flex items-center gap-3 p-3.5 rounded-xl border
                transition-all duration-200
                ${available
                    /* Active card: dark bg, indigo border on hover, grab cursor */
                    ? 'bg-[#1a1740] border-[#2d2b55] cursor-grab hover:border-brand-500 hover:shadow-node active:scale-95'
                    /* Inactive card: muted, not-allowed cursor */
                    : 'bg-[#141230] border-[#1e1b4b] opacity-50 cursor-not-allowed'
                }
            `}
        >
            {/* Coloured icon badge — gradient matches the node's header colour */}
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className="text-white" />
            </div>

            {/* Text block */}
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 leading-tight">{label}</p>
                <p className="text-xs text-slate-500 truncate">{description}</p>
            </div>

            {/* "Soon" badge — only on unavailable nodes */}
            {!available && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold bg-[#2d2b55] text-brand-300 px-1.5 py-0.5 rounded-full">
                    Soon
                </span>
            )}

            {/* "drag" hint — fades in on hover to teach new users the interaction */}
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
   A flex column that takes a fixed width (w-60) and contains:
     1. A header with the "Node Library" label and subtitle.
     2. A scrollable list of DraggableNode cards.
     3. A sticky footer tip reminding the user of the one-outgoing-edge rule.

   @param {object} props
   @param {Set}    props.nodesWithOutgoing — Set of node IDs that already
                   have an outgoing edge (passed from App for potential future
                   use, e.g. to visually mark "fully connected" nodes).
───────────────────────────────────────────────────────────────────────── */
export default function Sidebar({ nodesWithOutgoing }) {
    return (
        <aside className="w-60 flex-shrink-0 bg-[#13112b] border-r border-[#2d2b55] flex flex-col overflow-hidden">

            {/* Section heading */}
            <div className="px-4 pt-5 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400 mb-1">
                    Node Library
                </p>
                <p className="text-xs text-slate-500">Drag nodes onto the canvas</p>
            </div>

            {/* Horizontal rule separating header from the node list */}
            <div className="mx-4 h-px bg-[#2d2b55]" />

            {/* Scrollable node palette — grows to fill remaining height */}
            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5">
                {NODE_TYPES.map((node) => (
                    /* key = type string, which is guaranteed unique in NODE_TYPES */
                    <DraggableNode key={node.type} {...node} />
                ))}
            </div>

            {/* Sticky footer — connection rule reminder at a glance */}
            <div className="px-4 py-3 border-t border-[#2d2b55] bg-[#0f0f1a]/50">
                <p className="text-[11px] text-slate-600 leading-snug">
                    💡 Each node can have only <span className="text-brand-400 font-medium">one outgoing</span> connection.
                </p>
            </div>
        </aside>
    );
}
