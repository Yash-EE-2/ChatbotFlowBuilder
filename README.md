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

The app will be available at **https://chatbot-flow-builder-five-rho.vercel.app/**.

### Build for Production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
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
