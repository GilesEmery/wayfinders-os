export type LMUResponseIndicatorMode = "check" | "rank";

export function LMUResponseIndicator({ selected, value, mode = "check" }: { selected: boolean; value?: number | string; mode?: LMUResponseIndicatorMode }) {
  const content = selected ? mode === "rank" ? value : "✓" : mode === "rank" ? value ?? "—" : "";
  return <span className={`lmu-choice-indicator is-${mode}${selected ? " is-selected" : ""}`} aria-hidden="true">{content}</span>;
}

/** Backward-compatible name retained while the response-family migration lands. */
export function LMUChoiceIndicator({ selected, order }: { selected: boolean; order?: number }) {
  return <LMUResponseIndicator selected={selected} value={order} mode={order === undefined ? "check" : "rank"} />;
}
