/**
 * @file SettingsPanel.jsx
 * @description Right-side settings panel for the Chatbot Flow Builder.
 *
 * Behaviour overview
 * ──────────────────
 * • The panel is ALWAYS in the DOM; it slides in/out via a CSS width transition
 *   from w-0 (hidden) to w-72 (visible). This avoids a jarring pop-in effect.
 * • When selectedNode is not null, the panel renders its contents and
 *   auto-focuses the textarea so the user can start typing immediately.
 * • All changes to the textarea propagate UPWARD to App via onLabelChange,
 *   which in turn updates both the nodes array (canvas re-renders) and the
 *   selectedNode reference (this panel stays in sync).
 *
 * Connection stats
 * ────────────────
 * The panel shows live incoming and outgoing edge counts for the selected node.
 * These are derived via useMemo from the full edges array, re-computed only
 * when the selected node ID or the edges array changes.
 *
 * The outgoing count card changes colour:
 *   grey   → 0 connections (neutral)
 *   green  → exactly 1 connection (valid)
 *   red    → more than 1 connection (invalid — should not normally happen)
 *
 * @param {object}      props
 * @param {Node|null}   props.selectedNode  — The React Flow node currently selected,
 *                                            or null when nothing is selected
 * @param {Edge[]}      props.edges         — Full edge list from App state; used to
 *                                            compute live connection counts
 * @param {Function}    props.onLabelChange — (id, newLabel) => void; propagates edits
 * @param {Function}    props.onClose       — () => void; called when ✕ is clicked
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { X, MessageSquare, ArrowUpLeft, ArrowDownRight, Link2 } from 'lucide-react';


export default function SettingsPanel({ selectedNode, edges = [], onLabelChange, onClose }) {
    /** Ref to the main textarea so we can programmatically focus it. */
    const textareaRef = useRef(null);

    /* ─────────────────────────────────────────────────────────────────────
       Auto-focus effect
       ──────────────────
       Whenever a DIFFERENT node is selected (selectedNode?.id changes),
       focus the textarea and move the cursor to the end of the text.
       This lets the user start editing immediately without an extra click.

       We depend on selectedNode?.id rather than selectedNode to avoid
       re-running the effect when only the label changes (mid-edit).
    ───────────────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (selectedNode && textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            // Move cursor to end so typing appends rather than replaces
            textareaRef.current.setSelectionRange(len, len);
        }
    }, [selectedNode?.id]); // ← only re-run when the selected node ID changes


    /* ─────────────────────────────────────────────────────────────────────
       Live connection stats
       ─────────────────────
       Count how many edges start at (outgoing) or end at (incoming) the
       currently selected node. Uses a dedicated memo so we don't recount
       on every render — only when the node or edge list changes.
    ───────────────────────────────────────────────────────────────────── */
    const connectionStats = useMemo(() => {
        if (!selectedNode) return { incoming: 0, outgoing: 0 };
        return {
            incoming: edges.filter((e) => e.target === selectedNode.id).length,
            outgoing: edges.filter((e) => e.source === selectedNode.id).length,
        };
    }, [selectedNode?.id, edges]); // recompute when node or edges change


    /** Controls the CSS width class — drives the slide-in/out animation */
    const isVisible = !!selectedNode;

    return (
        /*
         * The aside is always rendered.
         * Width transitions from w-0 → w-72 create the smooth slide effect.
         * pointer-events-none when hidden prevents hidden inputs from being
         * tab-focusable, which would confuse keyboard users.
         */
        <aside
            className={`
                flex-shrink-0 bg-[#13112b] border-l border-[#2d2b55]
                flex flex-col overflow-hidden
                transition-[width,opacity] duration-300 ease-in-out
                ${isVisible ? 'w-72 opacity-100' : 'w-0 opacity-0 pointer-events-none'}
            `}
            aria-label="Node settings panel"
        >
            {/*
             * Only render the interior when visible.
             * This prevents hidden form elements from appearing in the
             * tab order and avoids unnecessary DOM nodes when closed.
             */}
            {isVisible && (
                <>
                    {/* ── Panel header ─────────────────────────────────────
                        Shows the MessageSquare icon, "Message Settings" title,
                        and an ✕ close button that calls onClose() → deselects the node.
                    ─────────────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#2d2b55] flex-shrink-0">
                        <div className="flex items-center gap-2">
                            {/* Branded icon badge */}
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center flex-shrink-0">
                                <MessageSquare size={13} className="text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-200">Message Settings</span>
                        </div>

                        {/* Close button — triggers onClose which sets selectedNode = null in App */}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#2d2b55] transition-colors"
                            aria-label="Close settings panel"
                            id="settings-panel-close"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* ── Node identity badges ─────────────────────────────
                        Shows the node's id and type so users know which node
                        they are editing. Styled as monospace code badges.
                    ─────────────────────────────────────────────────────── */}
                    <div className="px-4 pt-4 flex items-center gap-2 flex-shrink-0">
                        {/* Node ID — the Link2 icon reinforces the "connection/id" concept */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#2d2b55] text-brand-300 border border-[#3d3a7a]">
                            <Link2 size={9} /> id: {selectedNode.id}
                        </span>
                        {/* Node type — static label; could be dynamic for future node types */}
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#1a1740] text-slate-400 border border-[#2d2b55]">
                            textNode
                        </span>
                    </div>

                    {/* ── Message text editor ──────────────────────────────
                        Controlled textarea linked to selectedNode.data.label.
                        Changes propagate via onLabelChange → App.onNodeDataChange
                        → updates nodes array AND selectedNode simultaneously,
                        keeping the canvas node and this panel in perfect sync.
                    ─────────────────────────────────────────────────────── */}
                    <div className="px-4 pt-4 flex-shrink-0">
                        <label
                            htmlFor="node-label-textarea"
                            className="block mb-1.5 text-[11px] font-semibold text-brand-400 uppercase tracking-widest"
                        >
                            Message Text
                        </label>
                        <textarea
                            id="node-label-textarea"
                            ref={textareaRef}
                            value={selectedNode.data.label ?? ''}
                            onChange={(e) => onLabelChange(selectedNode.id, e.target.value)}
                            rows={5}
                            placeholder="Type your message here…"
                            className="
                                w-full resize-none rounded-xl
                                bg-[#1a1740] border border-[#2d2b55]
                                text-sm text-slate-200 placeholder:text-slate-600
                                px-3.5 py-3 leading-relaxed
                                focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40
                                transition-colors duration-150
                            "
                        />
                        {/* Character counter — mirrors the one inside the node */}
                        <p className="mt-1.5 text-[11px] text-slate-600 text-right select-none">
                            {selectedNode.data.label?.length ?? 0} / ∞ chars
                        </p>
                    </div>

                    {/* ── Live connection stats ────────────────────────────
                        Two side-by-side info cards showing edge counts.
                        Outgoing card changes colour to communicate validity:
                          • Default (grey bg)   = 0 outgoing
                          • Green bg            = 1 outgoing (valid, complete)
                          • Red bg              = >1 outgoing (invalid state — defensive UI)
                    ─────────────────────────────────────────────────────── */}
                    <div className="px-4 pt-5 flex-shrink-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-2.5">
                            Connections
                        </p>
                        <div className="flex gap-2">
                            {/* Incoming count — always grey, no restriction on incoming edges */}
                            <div className="flex-1 flex flex-col items-center gap-1 bg-[#1a1740] border border-[#2d2b55] rounded-xl py-3 px-2">
                                <ArrowUpLeft size={16} className="text-brand-400" />
                                <span className="text-xl font-bold text-slate-200">{connectionStats.incoming}</span>
                                <span className="text-[10px] text-slate-500 text-center leading-tight">Incoming<br />edges</span>
                            </div>

                            {/* Outgoing count — colour changes based on count */}
                            <div
                                className={`flex-1 flex flex-col items-center gap-1 border rounded-xl py-3 px-2
                                    ${connectionStats.outgoing > 1
                                        ? 'bg-rose-900/30 border-rose-500/40'   // red = over limit
                                        : connectionStats.outgoing === 1
                                            ? 'bg-emerald-900/20 border-emerald-500/30' // green = valid
                                            : 'bg-[#1a1740] border-[#2d2b55]'           // grey = no connection yet
                                    }
                                `}
                            >
                                <ArrowDownRight
                                    size={16}
                                    className={
                                        connectionStats.outgoing > 1 ? 'text-rose-400'
                                            : connectionStats.outgoing === 1 ? 'text-emerald-400'
                                                : 'text-slate-500'
                                    }
                                />
                                <span className="text-xl font-bold text-slate-200">{connectionStats.outgoing}</span>
                                <span className="text-[10px] text-slate-500 text-center leading-tight">Outgoing<br />edges</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Connection rules reminder ────────────────────────
                        Three bullet points teaching the user the flow's rules.
                        Dots are colour-coded to match the handle colours.
                    ─────────────────────────────────────────────────────── */}
                    <div className="px-4 pt-4 flex-shrink-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
                            Rules
                        </p>
                        <ul className="flex flex-col gap-1.5">
                            {[
                                { dot: 'bg-brand-400', text: 'Multiple incoming edges allowed' },
                                { dot: 'bg-emerald-400', text: 'Max 1 outgoing edge per node' },
                                { dot: 'bg-amber-400', text: 'One "start" node may be unconnected' },
                            ].map(({ dot, text }) => (
                                <li key={text} className="flex items-start gap-2 text-xs text-slate-500">
                                    {/* Colour dot matches handle/stat card colours for consistency */}
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${dot}`} />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Flexible spacer — pushes footer to the bottom */}
                    <div className="flex-1" />

                    {/* ── Footer tip ───────────────────────────────────────
                        Reminds the user they can edit in either the panel
                        OR directly within the node textarea.
                    ─────────────────────────────────────────────────────── */}
                    <div className="px-4 py-3 border-t border-[#2d2b55] bg-[#0f0f1a]/50 flex-shrink-0">
                        <p className="text-[11px] text-slate-600 leading-snug">
                            ✏️ Edit here <span className="text-brand-400 font-medium">or</span> directly in the node — changes sync instantly.
                        </p>
                    </div>
                </>
            )}
        </aside>
    );
}
