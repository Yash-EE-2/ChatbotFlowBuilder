/**
 * @file CustomTextNode.jsx
 * @description Custom React Flow node component for the "Send Message" node type.
 *
 * This component is the visual and interactive representation of a single
 * chatbot message step. It is registered in App.jsx under the key "textNode"
 * in the nodeTypes map.
 *
 * Structure
 * ─────────
 *   ┌──────────────────────────────┐  ← outer div: rounded card w/ selection ring
 *   │  ● (purple)   ← target handle (top-centre, accepts incoming edges)
 *   ├─ SEND MESSAGE ───────────────┤  ← gradient header
 *   │  [editable textarea        ] │  ← body: user types message here
 *   │                   N chars    │  ← character counter
 *   │  ● (green)    ← source handle (bottom-centre, one outgoing edge max)
 *   └──────────────────────────────┘
 *
 * Drag-safe textarea
 * ──────────────────
 * React Flow intercepts all pointer events on nodes to implement drag-to-move.
 * Inside a textarea this causes two problems:
 *   1. Clicking into the textarea starts a node drag instead.
 *   2. The drag ends the moment the textarea receives focus.
 *
 * Two mitigations are applied:
 *   a) stopPropagation on `onMouseDown` and `onPointerDown` — prevents the
 *      React Flow drag handler (which listens on a parent) from receiving
 *      the event.
 *   b) The CSS class "nodrag" — React Flow also checks for this class
 *      internally and skips its drag logic for elements that have it.
 *
 * @param {object}   props
 * @param {string}   props.id               - Unique node ID, injected by React Flow
 * @param {object}   props.data             - Node data: { label: string }
 * @param {boolean}  props.selected         - True when the node is selected on the canvas
 * @param {Function} props.onNodeDataChange - (id, newLabel) => void  callback to update
 *                                            global nodes state from inside the node
 */

import React, { useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare } from 'lucide-react';


export default function CustomTextNode({ id, data, selected, onNodeDataChange }) {

    /**
     * Stops the event from bubbling up to React Flow's pan/drag listeners.
     * Used on both mousedown and pointerdown to cover all pointer device types.
     * Wrapped in useCallback because it is passed to two separate JSX attributes
     * and we want a stable reference that doesn't recreate on every render.
     *
     * @param {React.SyntheticEvent} e - The synthetic event from React
     */
    const stopProp = useCallback((e) => e.stopPropagation(), []);

    /**
     * Fires on every keystroke inside the textarea.
     * Calls onNodeDataChange which lives in App.jsx and updates both the
     * nodes array and the selectedNode state simultaneously.
     *
     * @param {React.ChangeEvent<HTMLTextAreaElement>} e
     */
    const handleChange = useCallback(
        (e) => {
            onNodeDataChange?.(id, e.target.value);
        },
        [id, onNodeDataChange]
    );

    return (
        <div
            className={`
                relative w-64 rounded-2xl overflow-visible shadow-node
                transition-all duration-200 select-none
                ${selected
                    // Selected: indigo glow ring so the user knows which node is active
                    ? 'ring-2 ring-brand-400 shadow-[0_0_0_6px_rgba(99,102,241,0.20)]'
                    // Idle: subtle border that brightens on hover
                    : 'ring-1 ring-[#2d2b55] hover:ring-[#4338ca]'
                }
            `}
        >
            {/* ── Target handle (INCOMING) ─────────────────────────────
                Position: top-centre
                Colour:   purple (#818cf8) — matches the brand palette
                Accepts:  multiple incoming edges (no restriction here)
                Title:    shown as a native browser tooltip on hover
            ───────────────────────────────────────────────────────── */}
            <Handle
                type="target"
                position={Position.Top}
                id="target"
                style={{
                    width: 12,
                    height: 12,
                    background: '#818cf8',        // indigo — "input" colour
                    border: '2px solid #0f0f1a',  // dark ring separates from background
                    top: -6,                      // offset to sit exactly on the node edge
                }}
                title="Connect an incoming edge here"
            />

            {/* ── Header ───────────────────────────────────────────────
                Always shows "Send Message" with the MessageSquare icon.
                The gradient matches the Sidebar card, creating visual
                consistency between the palette item and the placed node.
            ───────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-700 to-brand-500 rounded-t-2xl">
                <MessageSquare size={13} className="text-white/80 flex-shrink-0" />
                <span className="text-[11px] font-bold text-white tracking-widest uppercase">
                    Send Message
                </span>
            </div>

            {/* ── Body — editable textarea ─────────────────────────────
                The textarea is the primary editing surface for the node.
                Key implementation notes:

                1. `value` + `onChange` = controlled component.
                   React owns the value; changes immediately propagate to
                   global state via onNodeDataChange.

                2. `onMouseDown={stopProp}` + `onPointerDown={stopProp}`
                   prevents React Flow's drag system from treating a click
                   into the textarea as a node-drag start event.

                3. CSS class `nodrag` — React Flow's built-in check:
                   if the target element has this class, the drag is
                   skipped entirely. Belt-and-suspenders with stopProp.

                4. `bg-transparent` + dark parent bg = the input blends
                   seamlessly into the card body.
            ───────────────────────────────────────────────────────── */}
            <div className="bg-[#1c1a45] rounded-b-2xl px-3 py-3">
                <textarea
                    value={data.label ?? ''}
                    onChange={handleChange}
                    onMouseDown={stopProp}   /* ← prevent node-drag on click */
                    onPointerDown={stopProp} /* ← cover touch / stylus events  */
                    placeholder="Type your message…"
                    rows={3}
                    className="
                        nodrag
                        w-full resize-none bg-transparent
                        text-sm text-slate-200 leading-relaxed placeholder:text-slate-600
                        focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:ring-inset
                        rounded-lg px-1 py-1 transition-colors duration-150 select-text
                    "
                    aria-label="Message text"
                />

                {/* Character counter — helps authors judge message length */}
                <p className="mt-1 text-[10px] text-slate-600 text-right select-none">
                    {data.label?.length ?? 0} chars
                </p>
            </div>

            {/* ── Source handle (OUTGOING) ─────────────────────────────
                Position: bottom-centre
                Colour:   emerald (#34d399) — "go / output" colour
                Limit:    ONE outgoing edge enforced by isValidConnection
                          in App.jsx (the handle itself has no restriction).
            ───────────────────────────────────────────────────────── */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="source"
                style={{
                    width: 12,
                    height: 12,
                    background: '#34d399',        // emerald — "output" colour
                    border: '2px solid #0f0f1a',  // dark ring for contrast
                    bottom: -6,                   // offset to sit on the node edge
                }}
                title="Drag to connect to another node (max 1 outgoing)"
            />
        </div>
    );
}
