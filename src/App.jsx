/**
 * @file App.jsx
 * @description Root application component for the Chatbot Flow Builder.
 *
 * Architecture overview
 * ─────────────────────
 * App (exported) wraps FlowBuilder inside <ReactFlowProvider> so that the
 * useReactFlow() hook — used for screenToFlowPosition — has access to the
 * React Flow context.
 *
 * FlowBuilder (internal) owns ALL shared state:
 *   • nodes / edges  — the canvas graph, managed by React Flow's own hooks
 *   • selectedNode   — drives the right-hand SettingsPanel
 *   • toast          — the top-centre notification banner
 *
 * Data flow
 * ─────────
 *   Sidebar        → (drag dataTransfer) → FlowBuilder.onDrop → nodes
 *   CustomTextNode → (onNodeDataChange)  → FlowBuilder        → nodes
 *   SettingsPanel  → (onLabelChange)     → FlowBuilder        → nodes + selectedNode
 *   SaveButton     → (onSave / resolve)  → FlowBuilder        → toast
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
    addEdge,          // helper to append an edge while avoiding duplicates
    Background,       // dot/line pattern behind the canvas
    Controls,         // zoom-in, zoom-out, fit-view buttons
    MiniMap,          // thumbnail overview in the corner
    useNodesState,    // managed state + onChange handler for nodes
    useEdgesState,    // managed state + onChange handler for edges
    useReactFlow,     // provides screenToFlowPosition, getNode, etc.
    ReactFlowProvider,// context provider required by useReactFlow
    BackgroundVariant,// enum: Dots | Lines | Cross
    MarkerType,       // enum for arrowhead styles on edges
} from 'reactflow';

import Sidebar from './components/Sidebar.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import SaveButton from './components/SaveButton.jsx';
import CustomTextNode from './components/CustomTextNode.jsx';
import CustomEdge from './components/CustomEdge.jsx';

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS — defined at module level so they are created once, not on
   every render. Placing them here avoids unnecessary object allocations.
───────────────────────────────────────────────────────────────────────── */

/**
 * The canvas starts with one example node so the user sees a non-empty
 * state immediately, reducing the time-to-first-interaction.
 */
const initialNodes = [
    {
        id: '1',
        type: 'textNode',           // must match a key in the nodeTypes map
        position: { x: 280, y: 200 },
        data: { label: 'Hello! How can I help you today? 👋' },
    },
];

/** No edges on first load — the user creates connections manually. */
const initialEdges = [];

/**
 * Monotonically increasing unique ID generator.
 * Stored as a module-level variable so it persists across re-renders
 * without needing useRef or useState. Starts at 2 because node id "1"
 * is reserved for the initial node.
 *
 * @returns {string} A unique string ID, e.g. "3", "4", …
 */
let _uid = 2;
const nextId = () => String(_uid++);


/* ─────────────────────────────────────────────────────────────────────────
   FLOWBUILDER — the real application component.
   Must live INSIDE <ReactFlowProvider> (see the exported App at the bottom).
───────────────────────────────────────────────────────────────────────── */
function FlowBuilder() {
    /**
     * Ref attached to the wrapper <div> around <ReactFlow>.
     * Previously used for coordinate conversion; kept for potential future
     * use (e.g., capturing screenshots or measuring canvas bounds).
     */
    const reactFlowWrapper = useRef(null);

    /**
     * screenToFlowPosition converts a {x, y} in browser viewport pixels
     * to the equivalent coordinates in the React Flow canvas space,
     * accounting for pan and zoom.
     *
     * Provided by useReactFlow() — requires <ReactFlowProvider> ancestor.
     */
    const { screenToFlowPosition } = useReactFlow();

    /* ── Graph state managed by React Flow's specialised hooks ── */
    // useNodesState returns [nodes, setNodes, onNodesChange].
    // onNodesChange handles built-in interactions (drag, select, delete).
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

    // useEdgesState similarly manages the edge list.
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    /** The currently selected node, or null when nothing is selected. */
    const [selectedNode, setSelectedNode] = useState(null);

    /**
     * Toast notification state.
     * Shape: { type: 'success' | 'error', msg: string } | null
     * Auto-cleared after 4 seconds by showToast().
     */
    const [toast, setToast] = useState(null);

    /**
     * A derived Set of source node IDs that already have at least one
     * outgoing edge. Passed to Sidebar so it could, for example, visually
     * mark nodes that are "connected". Recomputed only when edges change.
     */
    const nodesWithOutgoing = useMemo(
        () => new Set(edges.map((e) => e.source)),
        [edges]
    );


    /* ─────────────────────────────────────────────────────────────────────
       isValidConnection
       ─────────────────
       React Flow calls this synchronously when the user RELEASES a
       connection drag. Returning false cancels the connection and turns
       the target handle red — the user gets immediate visual feedback.

       Rules enforced here:
         1. A source node may only have ONE outgoing edge.
         2. No self-loops (source === target).
    ───────────────────────────────────────────────────────────────────── */
    const isValidConnection = useCallback(
        (connection) => {
            // Check if this source node already drives another edge
            const sourceHasOutgoing = edges.some((e) => e.source === connection.source);
            if (sourceHasOutgoing) return false; // block second outgoing edge

            // Prevent a node from connecting to itself
            if (connection.source === connection.target) return false;

            return true; // all checks passed — allow the connection
        },
        [edges] // must re-run when edges change so the closure sees fresh data
    );


    /* ─────────────────────────────────────────────────────────────────────
       onConnect
       ─────────
       Called by React Flow AFTER isValidConnection returns true.
       Adds the new edge to the edge list with consistent visual styling:
         • animated dashed line
         • indigo stroke colour matching the brand palette
         • closed arrowhead pointing at the target node
    ───────────────────────────────────────────────────────────────────── */
    const onConnect = useCallback(
        (params) => {
            setEdges((eds) =>
                addEdge(
                    {
                        ...params,
                        type: 'custom',           // use our CustomEdge renderer
                        animated: true,
                        style: { stroke: '#818cf8', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' },
                    },
                    eds
                )
            );
        },
        [setEdges]
    );


    /* ─────────────────────────────────────────────────────────────────────
       Drag-and-drop handlers
       ──────────────────────
       onDragOver: must call preventDefault() to allow a drop to occur
                   on the canvas element (browser default blocks drops).

       onDrop:     reads the node type string written to dataTransfer by
                   Sidebar's DraggableNode.onDragStart, converts the
                   mouse position to canvas coordinates, then appends a
                   new node at that position.
    ───────────────────────────────────────────────────────────────────── */
    const onDragOver = useCallback((event) => {
        event.preventDefault();                     // required to enable drop
        event.dataTransfer.dropEffect = 'move';     // show a move cursor
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            // Read the node type written by DraggableNode.onDragStart
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return; // safety guard: ignore drops without a type

            // Convert mouse screen coordinates to React Flow canvas coordinates.
            // This accounts for the canvas pan offset and current zoom level.
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const id = nextId();
            const newNode = {
                id,
                type,
                position,
                data: { label: `New message ${id}` }, // default placeholder label
            };

            // Append the new node; using a functional update avoids stale closure issues
            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition, setNodes]
    );


    /* ─────────────────────────────────────────────────────────────────────
       Node selection callbacks
       ───────────────────────
       onNodeClick:  React Flow passes the event + the full node object.
                     We store the node so SettingsPanel knows what to show.

       onPaneClick:  Clicking the empty canvas background deselects the node
                     and collapses the SettingsPanel.
    ───────────────────────────────────────────────────────────────────── */
    const onNodeClick = useCallback((_event, node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null); // collapse the settings panel
    }, []);


    /* ─────────────────────────────────────────────────────────────────────
       onNodeDataChange
       ────────────────
       Single source of truth for updating a node's label text.
       Called from two places:
         1. CustomTextNode's inline textarea (user types inside the node)
         2. SettingsPanel's textarea (user types in the right panel)

       Both surfaces call this with (id, newLabel), which:
         a) Updates the nodes array → canvas re-renders with new text.
         b) Updates selectedNode → SettingsPanel textarea stays in sync.

       Using functional updates for both `setNodes` and `setSelectedNode`
       ensures we always operate on the latest state, not a stale closure.
    ───────────────────────────────────────────────────────────────────── */
    const onNodeDataChange = useCallback(
        (id, newLabel) => {
            // Update the matching node in the nodes array
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === id
                        ? { ...n, data: { ...n.data, label: newLabel } }
                        : n
                )
            );

            // Mirror the change into selectedNode so SettingsPanel stays live
            setSelectedNode((prev) =>
                prev?.id === id
                    ? { ...prev, data: { ...prev.data, label: newLabel } }
                    : prev
            );
        },
        [setNodes]
    );


    /* ─────────────────────────────────────────────────────────────────────
       Toast helper
       ─────────────
       Centralises toast creation and auto-dismissal.
       The timeout clears after 4 s to give users time to read errors.
    ───────────────────────────────────────────────────────────────────── */
    const showToast = useCallback((type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);


    /* ─────────────────────────────────────────────────────────────────────
       handleSave — validation + save logic
       ─────────────────────────────────────
       Called by SaveButton with a Promise `resolve` callback.
       SaveButton awaits resolve(true | false) to pick its visual state.

       Validation rules
       ─────────────────
       Rule 1 — Single outgoing edge (belt-and-suspenders):
         isValidConnection already blocks >1 outgoing edges at connection
         time, but we re-check here to guard against any edge-case where
         the edge list could be out of sync.

       Rule 2 — All nodes except one must have an incoming edge:
         A flow must be a connected directed graph with exactly one "root"
         (start) node that has no incoming edges. Any other node with no
         incoming edge is a dangling/orphaned node that would never be
         reached in a real chatbot conversation.
    ───────────────────────────────────────────────────────────────────── */
    const handleSave = useCallback(
        (resolve) => {
            /**
             * Shorthand helpers that fire the toast AND signal the button.
             * @param {string} msg - Human-readable message shown in the toast.
             */
            const fail = (msg) => { showToast('error', msg); resolve?.(false); };
            const pass = (msg) => { showToast('success', msg); resolve?.(true); };

            // Guard: nothing to save
            if (nodes.length === 0) {
                fail('Canvas is empty — add at least one node before saving.');
                return;
            }

            // Rule 1 — no node may have more than 1 outgoing edge
            const multiOutgoing = nodes.filter(
                (n) => edges.filter((e) => e.source === n.id).length > 1
            );
            if (multiOutgoing.length > 0) {
                fail(
                    `Save failed: node${multiOutgoing.length > 1 ? 's' : ''} ` +
                    `(id: ${multiOutgoing.map((n) => n.id).join(', ')}) ` +
                    `have more than one outgoing connection.`
                );
                return;
            }

            // Rule 2 — every node except at most one must have ≥1 incoming edge
            if (nodes.length > 1) {
                // Find nodes that are not the target of any edge
                const disconnected = nodes.filter(
                    (n) => !edges.some((e) => e.target === n.id)
                );
                // Exactly one "root" node is fine; two or more means orphaned nodes exist
                if (disconnected.length > 1) {
                    fail(
                        `Save failed: ${disconnected.length} nodes have no incoming connections. ` +
                        `Only one "start" node is allowed to be unconnected.`
                    );
                    return;
                }
            }

            // All rules passed — flow is valid
            pass(
                `Flow saved! ${nodes.length} node${nodes.length !== 1 ? 's' : ''} · ` +
                `${edges.length} edge${edges.length !== 1 ? 's' : ''} 🎉`
            );
        },
        [nodes, edges, showToast]
    );


    /* ─────────────────────────────────────────────────────────────────────
       nodeTypes map
       ─────────────
       React Flow uses this object to look up which React component to
       render for each node's `type` field.

       IMPORTANT: This must be stable across renders (hence useMemo).
       If the reference changes on every render, React Flow will unmount
       and remount every node, losing focus and causing flickers.

       We pass onNodeDataChange as a prop here because React Flow's
       nodeTypes system doesn't natively support passing extra props —
       wrapping in an arrow function is the idiomatic workaround.
    ───────────────────────────────────────────────────────────────────── */
    const nodeTypes = useMemo(
        () => ({
            textNode: (props) => (
                <CustomTextNode {...props} onNodeDataChange={onNodeDataChange} />
            ),
        }),
        [onNodeDataChange] // recreate only if onNodeDataChange reference changes
    );

    /**
     * Stable edge-type map — same reasoning as nodeTypes above.
     * 'custom' maps to CustomEdge which shows the hover/click tooltip.
     */
    const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);


    /* ─────────────────────────────────────────────────────────────────────
       RENDER
       The layout is a flex column:
         • <header>  — logo, stat pills, Save Flow button
         • <div>     — three-column flex row:
             [Sidebar | ReactFlow canvas | SettingsPanel]
    ───────────────────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-screen bg-[#0f0f1a] font-sans">

            {/* ── Top Navigation Bar ─────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-3 bg-[#13112b] border-b border-[#2d2b55] z-10 flex-shrink-0">
                {/* Logo + title */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden shadow-node select-none flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" className="w-full h-full">
                            <defs>
                                <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="100%" stopColor="#4338ca" />
                                </linearGradient>
                                <linearGradient id="hbub" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.10" />
                                </linearGradient>
                            </defs>
                            <rect width="64" height="64" rx="15" fill="url(#hbg)" />
                            <rect x="9" y="10" width="46" height="32" rx="9" fill="url(#hbub)" stroke="white" strokeOpacity="0.35" strokeWidth="1.4" />
                            <path d="M14 42 L10 52 L22 45" fill="url(#hbub)" stroke="white" strokeOpacity="0.35" strokeWidth="1.4" strokeLinejoin="round" />
                            <rect x="19" y="21" width="8" height="8" rx="4" fill="white" fillOpacity="0.9" />
                            <rect x="37" y="21" width="8" height="8" rx="4" fill="white" fillOpacity="0.9" />
                            <circle cx="23" cy="25" r="2.2" fill="#4338ca" />
                            <circle cx="41" cy="25" r="2.2" fill="#4338ca" />
                            <rect x="22" y="33" width="20" height="3.5" rx="1.75" fill="white" fillOpacity="0.6" />
                        </svg>
                    </div>
                    <h1 className="text-base font-semibold text-white tracking-tight select-none">
                        Chatbot <span className="text-brand-400">Flow Builder</span>
                    </h1>
                </div>

                {/* Right side: live stats + save button */}
                <div className="flex items-center gap-3">
                    {/* Stat pills — show live node & edge counts */}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span className="px-2 py-1 rounded-lg bg-[#1e1b4b] border border-[#2d2b55]">
                            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-[#1e1b4b] border border-[#2d2b55]">
                            {edges.length} edge{edges.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {/* SaveButton receives handleSave and calls it with a resolve callback */}
                    <SaveButton onSave={handleSave} />
                </div>
            </header>

            {/* ── Toast Notification ─────────────────────────────────── */}
            {/*
                Conditionally rendered overlay banner.
                aria-live="assertive" ensures screen readers announce it immediately.
                animate-fade-in is a custom keyframe defined in index.css.
            */}
            {toast && (
                <div
                    className={`
                        fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4
                        px-5 py-3 rounded-xl text-sm font-medium shadow-panel
                        border transition-all duration-300 animate-fade-in
                        ${toast.type === 'success'
                            ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/40'
                            : 'bg-rose-900/95 text-rose-100 border-rose-500/40'
                        }
                    `}
                    role="alert"
                    aria-live="assertive"
                >
                    <span className="mr-2">{toast.type === 'success' ? '✅' : '❌'}</span>
                    {toast.msg}
                </div>
            )}

            {/* ── Main Three-Column Layout ────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT — Sidebar node palette */}
                {/*
                    nodesWithOutgoing is passed so the Sidebar can
                    potentially grey-out or badge nodes that are already
                    connected (currently unused in the UI but wired up).
                */}
                <Sidebar nodesWithOutgoing={nodesWithOutgoing} />

                {/* CENTRE — React Flow canvas */}
                <div
                    className="flex-1 relative"
                    ref={reactFlowWrapper}
                    id="react-flow-canvas" /* stable id for testing / automation */
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        edgeTypes={edgeTypes}           // custom edge with hover tooltip
                        onNodesChange={onNodesChange}   // built-in: drag, select, delete
                        onEdgesChange={onEdgesChange}   // built-in: select, delete
                        onEdgeDoubleClick={(_event, edge) =>
                            setEdges((eds) => eds.filter((e) => e.id !== edge.id))
                        }  // double-click an edge to instantly remove it
                        onConnect={onConnect}           // fires after isValidConnection passes
                        isValidConnection={isValidConnection} // fires before onConnect
                        onDrop={onDrop}                 // handles node drop from sidebar
                        onDragOver={onDragOver}         // must preventDefault to allow drop
                        onNodeClick={onNodeClick}       // opens SettingsPanel
                        onPaneClick={onPaneClick}       // closes SettingsPanel
                        nodeTypes={nodeTypes}           // custom node component map
                        fitView                         // fit all nodes into view on mount
                        fitViewOptions={{ padding: 0.3 }}
                        className="bg-[#0f0f1a]"
                        attributionPosition="bottom-left"
                        deleteKeyCode={['Backspace', 'Delete']} // keyboard node/edge deletion
                        edgesUpdatable={true}   // allow dragging edge endpoints to reconnect
                        edgesFocusable={true}   // allow edges to be focused/selected via keyboard
                        /* Style applied to the live connection line while dragging */
                        connectionLineStyle={{ stroke: '#6366f1', strokeDasharray: '6 3', strokeWidth: 2 }}
                        /* Default visual properties applied to every new edge */
                        defaultEdgeOptions={{
                            type: 'custom',       // use CustomEdge with hover tooltip
                            animated: true,
                            style: { stroke: '#818cf8', strokeWidth: 2 },
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#818cf8' },
                        }}
                    >
                        {/* Dot-grid background pattern */}
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={24}
                            size={1.5}
                            color="#252250"
                        />

                        {/* Zoom / pan / fit-view controls — bottom-left corner */}
                        <Controls
                            className="!bottom-6 !left-6"
                            showInteractive={false} /* hide the lock-interaction toggle */
                        />

                        {/* Thumbnail minimap — bottom-right corner */}
                        <MiniMap
                            nodeColor={(n) => (n.selected ? '#a5b4fc' : '#6366f1')}
                            maskColor="rgba(15,15,26,0.80)"
                            className="!bottom-6 !right-6"
                        />
                    </ReactFlow>

                    {/* Empty-canvas placeholder — shown only when no nodes exist */}
                    {nodes.length === 0 && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#4338ca]">
                            <div className="text-6xl animate-bounce">💬</div>
                            <p className="text-lg font-medium text-slate-500">
                                Drag a <span className="text-brand-400 font-semibold">Text Message</span> node from the sidebar to begin
                            </p>
                        </div>
                    )}
                </div>

                {/* RIGHT — Settings Panel (hidden when no node selected) */}
                {/*
                    Passes the full `edges` array so the panel can compute
                    live incoming/outgoing edge counts for the selected node.
                */}
                <SettingsPanel
                    selectedNode={selectedNode}
                    edges={edges}
                    onLabelChange={onNodeDataChange}
                    onClose={() => setSelectedNode(null)}
                />
            </div>
        </div>
    );
}


/* ─────────────────────────────────────────────────────────────────────────
   App — exported root component
   ──────────────────────────────
   <ReactFlowProvider> must wrap any component that uses useReactFlow().
   Placing the provider here (rather than in main.jsx) keeps the React Flow
   context scoped to just the flow builder, not the entire app.
───────────────────────────────────────────────────────────────────────── */
export default function App() {
    return (
        <ReactFlowProvider>
            <FlowBuilder />
        </ReactFlowProvider>
    );
}
