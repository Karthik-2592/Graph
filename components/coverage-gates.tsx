"use client";
// G4: tri-state gates in the coverage panel (G1/G4 completion).
export function GateStates({ gates }: { gates: { id: string; state: string; detail: string }[] }) {
  return (
    <ul className="space-y-0.5">
      {gates.map((g) => (
        <li key={g.id} className="flex gap-2">
          <span className={g.state === "ok" ? "text-green-600" : g.state === "fail" ? "text-red-600" : "text-amber-600"}>{g.state}</span>
          <span className="font-mono">{g.id}</span>
          <span className="text-fg-muted">{g.detail}</span>
        </li>
      ))}
    </ul>
  );
}
