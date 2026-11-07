"use client";

// Small shared collapse toggle used for rail / details / saved-parsers panels.
export function CollapseToggle({
  open,
  onToggle,
  label,
  className = "",
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={label}
      aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
      title={`${open ? "Collapse" : "Expand"} ${label}`}
      onClick={onToggle}
      className={`flex shrink-0 items-center justify-center text-fg-muted hover:bg-raised hover:text-fg ${className}`}
    >
      <span aria-hidden="true" className="text-[11px] leading-none">
        {open ? "‹" : "›"}
      </span>
    </button>
  );
}
