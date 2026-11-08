"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  getViewportForBounds,
  useNodesState,
  useReactFlow,
  useStore,
  type Edge as FlowEdge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Folding } from "@/lib/graph/fold";
import {
  categoryFocus,
  endpointKey,
  highlight as highlightFor,
  hoverEndpoint,
  type Selection,
} from "@/lib/graph/highlight";
import { ABOVE_HANDLE, BELOW_HANDLE, buildView } from "@/lib/graph/view";
import { UNCLASSIFIED } from "@/lib/roles";
import type { Edge, ParsedFile } from "@/lib/parser/types";
import { layout, type Box } from "./layout";
import {
  FoldedNodeView,
  MapActions,
  MapSelection,
  PanelNodeView,
  type FoldedNode,
  type PanelNode,
} from "./nodes";

const nodeTypes: NodeTypes = { folded: FoldedNodeView, panel: PanelNodeView };
const FIT_PADDING = 0.06;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
/** Initial fit may enlarge a small graph a little, never to poster size. */
const INITIAL_MAX_ZOOM = 1.25;

/** What the map draws and what it reports back. State lives with the caller, so the detail pane can drive the same selection. */
export type MapControl = {
  files: ParsedFile[];
  edges: Edge[];
  folding: Folding;
  /** Open groups and how far each has been scrolled. */
  open: ReadonlyMap<string, number>;
  selection: Selection;
  /** Whatever the pointer is over, here or in the pane. */
  hover: Selection;
  /** Changes whenever an open should refit the view to the new layout. */
  refit: number;
  /** The rail category (a role, or unclassified) left bright, or null for all of them. */
  category: string | null;
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onSelectFile: (path: string) => void;
  onScroll: (id: string, offset: number) => void;
  onHover: (hover: Selection) => void;
  onDeselect: () => void;
};

export function DependencyMap(props: MapControl) {
  return (
    <ReactFlowProvider>
      <MapCanvas {...props} />
    </ReactFlowProvider>
  );
}

function MapCanvas({
  files,
  edges,
  folding,
  open,
  selection,
  hover,
  refit,
  category,
  onOpen,
  onClose,
  onSelectFile,
  onScroll,
  onHover,
  onDeselect,
}: MapControl) {
  const view = useMemo(() => buildView(files, edges, folding, open), [files, edges, folding, open]);
  // Dagre gives an instant layout; ELK (Task 12: wins at scale) upgrades it
  // asynchronously. Until ELK resolves — or if it times out — dagre stands.
  const dagreBoxes = useMemo(() => layout(view.objects, view.edges), [view]);
  // ELK boxes are keyed to the exact view they were computed for; stale
  // boxes from a previous view must never be used (missing dir:. crash).
  const [elkState, setElkState] = useState<{ view: typeof view; boxes: Map<string, { x: number; y: number; width: number; height: number }> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./elk-layout").then(({ layoutElk }) => layoutElk(view.objects, view.edges).then((b) => { if (!cancelled) setElkState({ view, boxes: b }); }).catch(() => { /* dagre fallback stands */ }));
    return () => { cancelled = true; };
  }, [view]);
  const boxes = elkState?.view === view ? elkState.boxes : dagreBoxes;
  const lit = useMemo(() => highlightFor(view, edges, selection), [view, edges, selection]);
  const hovered = useMemo(() => hoverEndpoint(view, hover), [view, hover]);
  const railKeys = useMemo(
    () => new Map(files.map((f) => [f.path, f.role ?? UNCLASSIFIED])),
    [files],
  );
  const focus = useMemo(() => categoryFocus(view, category, railKeys), [view, category, railKeys]);

  // Canvas objects hidden/bypassed via the node context menu. The node stays
  // on the canvas at reduced opacity, but every edge touching it is dropped.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleHidden = useCallback(
    (id: string) => {
      const wasHidden = hidden.has(id);
      setHidden((prev) => {
        const next = new Set(prev);
        if (wasHidden) next.delete(id);
        else next.add(id);
        return next;
      });
      setMenu(null);
      if (!wasHidden) {
        // Hiding the selection (or a file inside it) leaves nothing to point at.
        if (selection?.kind === "group" && selection.id === id) onDeselect();
        else if (selection?.kind === "file") {
          const dir = folding.groupOf.get(selection.path);
          if (dir !== undefined && `dir:${dir}` === id) onDeselect();
        }
      }
    },
    [hidden, selection, folding, onDeselect],
  );

  // Dismiss the context menu on any outside pointer-down or Escape.
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const onNodeContextMenu = useCallback((event: ReactMouseEvent, node: { id: string }) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ id: node.id, x: event.clientX, y: event.clientY });
  }, []);

  const baseNodes = useMemo(
    () =>
      view.objects.map((o): FoldedNode | PanelNode => {
        const box = boxes.get(o.id);
        if (!box) throw new Error(`No layout box for ${o.id}`);
        const base = { id: o.id, position: { x: box.x, y: box.y }, width: box.width, height: box.height };
        return o.kind === "folded" ? { ...base, type: "folded", data: o } : { ...base, type: "panel", data: o };
      }),
    [view, boxes],
  );

  // Draggable nodes: React Flow's own nodes state, so every change it reports
  // (position *and* measured dimensions) is applied — without the dimensions
  // changes a node never becomes "initialized" and dragging logs error 015.
  // The layout nodes are merged in during render (React's adjust-state-during-
  // render pattern), not in an effect: an effect would let React Flow see
  // edges for the new layout while nodes still carry the old data, so edges
  // point at handles that are not on the node yet (error 008) and may never
  // recover. Re-rendering before commit means nodes and edges always match.
  // Existing nodes keep their dragged position across layout recomputes, new
  // nodes take their layout position, removed nodes are dropped.
  const [nodes, setNodes, onNodesChange] = useNodesState<FoldedNode | PanelNode>(baseNodes);
  const [prevBaseNodes, setPrevBaseNodes] = useState(baseNodes);
  if (prevBaseNodes !== baseNodes) {
    setPrevBaseNodes(baseNodes);
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return baseNodes.map((n) => {
        const prevNode = prevById.get(n.id);
        return prevNode ? { ...n, position: prevNode.position } : n;
      });
    });
  }

  const flowEdges = useMemo(
    () => {
      const dim: FlowEdge[] = [];
      const bright: FlowEdge[] = [];
      const byId = new Map(view.objects.map((o) => [o.id, o]));
      for (const e of view.edges) {
        // Hidden/bypassed nodes keep their box but lose every touching edge.
        if (hidden.has(e.source) || hidden.has(e.target)) continue;
        // Only hand React Flow an edge whose handles are actually rendered
        // on both nodes right now. Passing one whose handle is missing logs
        // error 008 and the edge is dropped until something re-measures the
        // node — which may never happen, leaving the edge invisible.
        if (!hasHandle(byId.get(e.source), e.sourceHandle) || !hasHandle(byId.get(e.target), e.targetHandle)) continue;
        // Direction only gets colour once there's a selection for it to be
        // relative to: green flows into it, amber flows out of it.
        const stroke = lit?.incoming.has(e.id) ? "var(--incoming)" : lit?.outgoing.has(e.id) ? "var(--outgoing)" : undefined;
        // Under a category, a line stays bright only when both of its ends do.
        const outOfFocus =
          focus !== null &&
          !(focus.endpoints.has(endpointKey(e.source, e.sourceHandle)) && focus.endpoints.has(endpointKey(e.target, e.targetHandle)));
        (stroke ? bright : dim).push({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: e.targetHandle,
          style: {
            // Thickness says how many imports one line stands for, gently.
            strokeWidth: Math.min(2.5, 0.75 + Math.log2(e.count) / 3),
            stroke,
            opacity: (lit && !stroke) || outOfFocus ? 0.15 : 1,
          },
        });
      }
      // Bright edges are drawn last so they cross over the dim ones. Order,
      // not zIndex: a raised edge would also draw over the nodes.
      return [...dim, ...bright];
    },
    [view, lit, focus, hidden],
  );

  // Refit after an open, against the layout that open produced. The caller
  // changes `refit` in the same update as `open`, so by the time this sees a
  // new value the boxes are already the new ones, never the state before.
  const refitted = useRef(refit);
  const { getZoom, setViewport } = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  useEffect(() => {
    if (refitted.current === refit) return;
    refitted.current = refit;
    // Focus the selected node instead of fitting the whole graph: fitting
    // everything on every reveal made focusing reset the view to poster size.
    const sel = selection?.kind === "file" ? boxes.get(`dir:${folding.groupOf.get(selection.path) ?? "."}`) : selection?.kind === "group" ? boxes.get(selection.id) : undefined;
    if (sel) {
      const zoom = Math.max(getZoom(), 0.8);
      setViewport({ x: width / 2 - (sel.x + sel.width / 2) * zoom, y: height / 2 - (sel.y + sel.height / 2) * zoom, zoom });
      return;
    }
    // Capping at the current zoom means this can only ever zoom out: fitting
    // everything including the new panel, never zooming into the panel.
    setViewport(getViewportForBounds(boundsOf(boxes), width, height, MIN_ZOOM, getZoom(), FIT_PADDING));
  }, [refit, boxes, width, height, getZoom, setViewport, selection, folding]);

  const actions = useMemo(
    () => ({ close: onClose, selectFile: onSelectFile, scroll: onScroll, hover: onHover }),
    [onClose, onSelectFile, onScroll, onHover],
  );
  const selectionValue = useMemo(
    () => ({ selection, highlight: lit, hovered, focus, category, hidden }),
    [selection, lit, hovered, focus, category, hidden],
  );

  const menuObject = menu ? view.objects.find((o) => o.id === menu.id) : undefined;

  // Suppress the click that follows a drag: without this, dragging a folded
  // node would open it on release.
  const dragged = useRef<{ id: string; time: number } | null>(null);

  return (
    <MapActions.Provider value={actions}>
      <MapSelection.Provider value={selectionValue}>
        <ReactFlow
          nodes={nodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          fitView
          fitViewOptions={{ padding: FIT_PADDING, maxZoom: INITIAL_MAX_ZOOM }}
          // Folded nodes open here. Panels handle their own header and row
          // clicks, which bubble up to this too and are ignored.
          onNodeDragStop={(_, node) => {
            dragged.current = { id: node.id, time: Date.now() };
          }}
          onNodeClick={(_, node) => {
            if (dragged.current?.id === node.id && Date.now() - dragged.current.time < 300) return;
            if (hidden.has(node.id)) return;
            if (node.type === "folded") onOpen(node.id);
          }}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onDeselect}
          onPaneContextMenu={() => setMenu(null)}
        />
        {menu && menuObject && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Node options"
            className="fixed z-50 min-w-40 overflow-hidden rounded border border-line bg-surface shadow-lg"
            style={{
              left: Math.min(menu.x, window.innerWidth - 176),
              top: Math.min(menu.y, window.innerHeight - 96),
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <p className="truncate border-b border-line px-3 py-1.5 font-mono text-[10px] text-fg-muted" title={menuObject.dir}>
              {menuObject.label}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={() => toggleHidden(menu.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-raised"
            >
              {hidden.has(menu.id) ? "Show" : "Hide / bypass"}
            </button>
          </div>
        )}
      </MapSelection.Provider>
    </MapActions.Provider>
  );
}

// Whether the node view actually renders a handle with this id: its anonymous
// handles for folded nodes, row handles for the shown rows of a panel, and
// the above/below handles only while the panel scrolls (see PanelNodeView).
function hasHandle(object: { kind: string; rows?: readonly { path: string }[]; scrolls?: boolean } | undefined, handle: string | null): boolean {
  if (!object) return false;
  if (handle === null) return true;
  if (object.kind === "folded") return false;
  if (handle === ABOVE_HANDLE || handle === BELOW_HANDLE) return object.scrolls === true;
  return object.rows?.some((r) => r.path === handle) ?? false;
}

function boundsOf(boxes: ReadonlyMap<string, Box>): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes.values()) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
