# 💬 Chatbot Flow Builder

A **visual, drag-and-drop chatbot conversation designer** built with **React**, **React Flow**, and **Tailwind CSS**.  
Design multi-step chatbot flows by placing, connecting, and editing message nodes on an infinite canvas — no coding required.

---

## 🖼️ Preview

| Canvas with nodes & edges | Settings panel open | Save validation error |
|---|---|---|
| Drag nodes from the left sidebar, connect them with animated edges, and edit messages inline | Click any node to open the live settings panel on the right | Disconnected nodes trigger a clear red error toast |

---

## ✨ Features

### 1. 🖱️ Drag-and-Drop Node Creation
- Drag a **Text Message** node from the left sidebar onto the canvas at any position.
- The node is created exactly at the drop coordinates, converted from screen pixels to React Flow canvas coordinates using the `useReactFlow` hook.
- Each dropped node receives a unique auto-incrementing numeric ID.

### 2. 📝 Dual Editing Surface
- Edit a node's message **directly inside the node** via its inline textarea — changes update global state in real-time.
- Alternatively, **click a node** to open the right-hand **Settings Panel**, which provides a larger textarea connected to the same state — both surfaces stay in sync instantly.

### 3. 🔗 Edge Connections with Business Rules
- Connect nodes by dragging from the **green source handle** (bottom of a node) to the **purple target handle** (top of another node).
- **Rule enforced at connection time** via `isValidConnection`:
  - ✅ Multiple **incoming** edges per node are allowed.
  - ❌ Only **one outgoing** edge per node — attempting a second connection is blocked visually (handle turns red) before the edge is even created.
  - ❌ Self-loops are blocked.
- Edges are animated dashed lines with arrowheads for clear flow direction.

### 4. 📋 Settings Panel
- Slides in/out smoothly from the right side using a CSS width transition.
- Displays:
  - **Node ID** and type badge.
  - **Editable message textarea** — linked two-ways with the canvas node.
  - **Live connection stats** — incoming and outgoing edge counts update as edges are added/removed; outgoing counter turns green (1 edge) or red (>1 edges).
  - **Connection rules** reminder.
- Closes when clicking the canvas background or the ✕ button.

### 5. 💾 Save & Validation
- The **Save Flow** button runs two validation rules before saving:
  1. **Rule 1 — Disconnected nodes**: Every node except at most one (the "start" node) must have at least one incoming edge. If two or more nodes are unconnected, save is blocked with a descriptive error message.
  2. **Rule 2 — Multiple outgoing edges**: No node may have more than one outgoing edge (belt-and-suspenders guard alongside `isValidConnection`).
- Visual feedback:
  - **Green "Saved!" button** + green toast on success.
  - **Red "Failed" button** + red toast on validation failure, with the exact reason.
- Button uses a **Promise-based handshake** with the parent so result feedback is decoupled from validation logic.

### 6. 🎨 Premium Dark UI
- Full dark theme using a curated indigo/violet palette.
- Animated dashed connection lines, glowing node selection ring, handle colour-shift on hover.
- Live **node/edge count** pills in the navbar.
- "Coming soon" badges on future node types (Image, Condition, Question).
- Persistent MiniMap + zoom/pan Controls overlaid on the canvas.

---

## 🗂️ Project Structure

```
Bitespeed/
├── index.html                      # HTML entry point — loads Inter font, sets meta tags
├── package.json                    # Dependencies & npm scripts
├── vite.config.js                  # Vite bundler config (React plugin)
├── tailwind.config.js              # Tailwind theme: brand palette, fonts, safelist
├── postcss.config.js               # PostCSS: Tailwind + Autoprefixer
└── src/
    ├── main.jsx                    # React DOM root — mounts <App />
    ├── index.css                   # Global styles: Tailwind directives, React Flow overrides, animations
    ├── App.jsx                     # ★ Root component — all state & logic lives here
    └── components/
        ├── CustomTextNode.jsx      # Custom React Flow node with inline editable textarea
        ├── Sidebar.jsx             # Left panel: draggable node type palette
        ├── SettingsPanel.jsx       # Right panel: per-node settings, live connection stats
        └── SaveButton.jsx          # Animated save button with success/error states
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18  
- **npm** ≥ 9

### Installation

```bash
# 1. Clone or open the project folder
cd Bitespeed

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Build for Production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

---

## 🧩 Component API

### `<App />` (Root)
Wraps `<FlowBuilder />` inside `<ReactFlowProvider>` so the `useReactFlow()` hook works inside the tree.

### `<FlowBuilder />` (Internal)
Owns all state and renders the three-column layout.

| State | Type | Purpose |
|---|---|---|
| `nodes` | `Node[]` | React Flow node list — managed by `useNodesState` |
| `edges` | `Edge[]` | React Flow edge list — managed by `useEdgesState` |
| `selectedNode` | `Node \| null` | Currently selected node, drives SettingsPanel visibility |
| `toast` | `{ type, msg } \| null` | Drives the top-centre notification banner |

| Callback | Signature | Purpose |
|---|---|---|
| `isValidConnection` | `(connection) → boolean` | Blocks >1 outgoing edge and self-loops at connection time |
| `onConnect` | `(params) → void` | Adds an animated edge after validation passes |
| `onDrop` | `(event) → void` | Creates a new node at the drop position |
| `onNodeDataChange` | `(id, label) → void` | Updates node label — shared by inline textarea & SettingsPanel |
| `handleSave` | `(resolve) → void` | Runs validation rules, calls `resolve(true/false)` for SaveButton |

---

### `<CustomTextNode />` (`src/components/CustomTextNode.jsx`)
A custom React Flow node type registered as `"textNode"`.

| Prop | Type | Description |
|---|---|---|
| `id` | `string` | Node ID injected by React Flow |
| `data` | `{ label: string }` | Node data object |
| `selected` | `boolean` | True when node is selected — triggers glow ring |
| `onNodeDataChange` | `(id, label) => void` | Callback to update node label from inline textarea |

**Key design choices:**
- `stopPropagation` + CSS class `nodrag` on the textarea prevent React Flow from treating text editing as a node drag.
- Inline character counter shows current message length.

---

### `<Sidebar />` (`src/components/Sidebar.jsx`)
Renders the node type palette. Each card sets `event.dataTransfer` with `'application/reactflow'` and the node type string on drag-start. `<App>`'s `onDrop` reads this to decide what kind of node to create.

| NODE_TYPES field | Description |
|---|---|
| `type` | Identifier used by React Flow's `nodeTypes` map |
| `available` | `false` → disabled with "Soon" badge, cannot be dragged |

---

### `<SettingsPanel />` (`src/components/SettingsPanel.jsx`)

| Prop | Type | Description |
|---|---|---|
| `selectedNode` | `Node \| null` | Node to display; `null` collapses panel to `w-0` |
| `edges` | `Edge[]` | Full edge list — used to compute live incoming/outgoing counts |
| `onLabelChange` | `(id, label) => void` | Propagates textarea edits to global state |
| `onClose` | `() => void` | Called when ✕ is clicked |

Live connection stats use `useMemo` keyed on `selectedNode?.id` and the full `edges` array.

---

### `<SaveButton />` (`src/components/SaveButton.jsx`)
Four visual states: `idle → saving → success | error → idle`.

Uses a **Promise-based handshake** with `App`:
1. On click, creates a `Promise` and passes `resolve` to `onSave(resolve)`.
2. `App` runs validation, then calls `resolve(true)` or `resolve(false)`.
3. Button awaits the result and transitions to `success` or `error` state for 1.8 s.

This design **decouples** save UX from validation logic — the button has zero knowledge of what "valid" means.

---

## 🔧 Extending the Builder

### Add a New Node Type

1. **Create the component** in `src/components/`, e.g. `ImageNode.jsx`. Model it after `CustomTextNode.jsx`.
2. **Register it** in `App.jsx` inside the `useMemo` that builds `nodeTypes`:
   ```js
   imageNode: (props) => <ImageNode {...props} onNodeDataChange={onNodeDataChange} />,
   ```
3. **Enable it** in `Sidebar.jsx` by setting `available: true` on the matching entry in `NODE_TYPES`.

### Add Edge Types
Pass a custom `edgeTypes` prop to `<ReactFlow>` and create a component in `src/components/edges/`.

### Persist State
Replace `useNodesState` / `useEdgesState` with state stored in `localStorage` or a backend:
```js
const saved = JSON.parse(localStorage.getItem('flow') ?? '{}');
const [nodes, setNodes, onNodesChange] = useNodesState(saved.nodes ?? initialNodes);
```
In `handleSave`, after validation passes, call:
```js
localStorage.setItem('flow', JSON.stringify({ nodes, edges }));
```

---

## 🛠️ Tech Stack

| Technology | Version | Role |
|---|---|---|
| [React](https://react.dev) | 18 | UI component framework |
| [React Flow](https://reactflow.dev) | 11 | Canvas, nodes, edges, drag-and-drop |
| [Tailwind CSS](https://tailwindcss.com) | 3 | Utility-first styling |
| [Vite](https://vitejs.dev) | 6 | Dev server & bundler |
| [Lucide React](https://lucide.dev) | latest | Icon library |

---

## 📐 Design Decisions

| Decision | Rationale |
|---|---|
| `useReactFlow()` for coordinate conversion | More idiomatic than storing `reactFlowInstance` in state; works as long as the component is inside `<ReactFlowProvider>` |
| `isValidConnection` at the React Flow level | Blocks invalid connections *visually* (handle colour changes) before the edge is created — better UX than rejecting in `onConnect` |
| Promise handshake in `SaveButton` | Lets the button animate independently of App's validation logic — single responsibility |
| `nodrag` class on textarea | Tells React Flow's internal drag handler to ignore pointer events originating from the textarea, preventing accidental node drags while typing |
| `useMemo` for `nodeTypes` | Prevents React Flow from re-registering node types on every render, which would cause all nodes to unmount and remount |

---

## 📄 License

MIT — free to use, modify, and distribute.
