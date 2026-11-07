"use client";

import { useState, type ReactNode } from "react";
import { CollapseToggle } from "./collapsible";

// The one layout every analysis renders into. Column positions and widths are
// fixed here and nowhere else: later phases fill the columns, they don't move
// them. The detail pane is a real column, not an overlay, so opening it never
// covers the map. The categories (rail) and details columns are collapsible so
// the map can use the full width; collapsing narrows them to a toggle strip.
export function Shell({ rail, map, detail }: { rail?: ReactNode; map?: ReactNode; detail?: ReactNode }) {
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const cols = `${categoriesOpen ? "11rem" : "1.5rem"} minmax(0,1fr) ${detailsOpen ? "20rem" : "1.5rem"}`;

  return (
    <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: cols }}>
      <nav aria-label="Categories" className="flex min-h-0 overflow-hidden border-r border-line bg-surface">
        {categoriesOpen ? (
          <>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{rail}</div>
            <CollapseToggle open onToggle={() => setCategoriesOpen(false)} label="Categories" className="w-6 border-l border-line" />
          </>
        ) : (
          <CollapseToggle open={false} onToggle={() => setCategoriesOpen(true)} label="Categories" className="w-full" />
        )}
      </nav>
      <section aria-label="Map" className="relative min-h-0 min-w-0 bg-canvas">
        {map}
      </section>
      <aside aria-label="Details" className="flex min-h-0 overflow-hidden border-l border-line bg-surface">
        {detailsOpen ? (
          <>
            <CollapseToggle open onToggle={() => setDetailsOpen(false)} label="Details" className="w-6 border-r border-line" />
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{detail}</div>
          </>
        ) : (
          <CollapseToggle open={false} onToggle={() => setDetailsOpen(true)} label="Details" className="w-full" />
        )}
      </aside>
    </div>
  );
}
