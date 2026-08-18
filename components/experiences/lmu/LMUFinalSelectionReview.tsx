import type { ReactNode } from "react";

export function LMUFinalSelectionGroup({ label, secondary = false, children }: { label: string; secondary?: boolean; children: ReactNode }) {
  return <section className={`lmu-final-review-group${secondary ? " is-secondary" : ""}`} aria-label={label}><p className="eyebrow">{label}</p><ol>{children}</ol></section>;
}

export function LMUFinalSelectionRow({ rank, total, title, badge, context, actions, disclosureLabel, expanded = false, onToggleDisclosure, detail, after, draggable = false, onDragStart, onDragOver, onDrop }: { rank: number; total: number; title: string; badge: ReactNode; context?: ReactNode; actions?: ReactNode; disclosureLabel?: string; expanded?: boolean; onToggleDisclosure?: () => void; detail?: ReactNode; after?: ReactNode; draggable?: boolean; onDragStart?: React.DragEventHandler<HTMLButtonElement>; onDragOver?: React.DragEventHandler<HTMLLIElement>; onDrop?: React.DragEventHandler<HTMLLIElement> }) {
  return <li className="lmu-final-review-row" aria-label={`${title}, position ${rank} of ${total}`} onDragOver={onDragOver} onDrop={onDrop}><span className="lmu-final-review-rank">{String(rank).padStart(2, "0")}</span><div className="lmu-final-review-badge">{badge}</div><div className="lmu-final-review-copy"><h2>{title}</h2>{context && <div className="lmu-final-review-context">{context}</div>}{onToggleDisclosure && <button className="lmu-final-review-disclosure" type="button" aria-expanded={expanded} onClick={onToggleDisclosure}>{expanded ? `− Hide ${disclosureLabel}` : `+ View ${disclosureLabel}`}</button>}{expanded && detail && <div className="lmu-final-review-detail">{detail}</div>}</div>{(draggable || actions) && <div className="lmu-final-review-actions">{draggable && <button type="button" draggable onDragStart={onDragStart} aria-label={`Drag ${title} from position ${rank}`}>↕ Drag</button>}{actions}</div>}{after && <div className="lmu-final-review-after">{after}</div>}</li>;
}

export function LMUFinalMoveControls({ title, index, lastIndex, onMove, children }: { title: string; index: number; lastIndex: number; onMove: (direction: -1 | 1) => void; children?: ReactNode }) {
  return <><button type="button" disabled={index === 0} aria-label={`Move ${title} up`} onClick={() => onMove(-1)}><span aria-hidden="true">↑</span> Move Up</button><button type="button" disabled={index === lastIndex} aria-label={`Move ${title} down`} onClick={() => onMove(1)}><span aria-hidden="true">↓</span> Move Down</button>{children}</>;
}

export function LMUInlineReplacementChooser({ heading, choices, onChoose, onCancel, id }: { heading: string; choices: { id: string; title: string; rank: number }[]; onChoose: (index: number) => void; onCancel: () => void; id?: string }) {
  return <div className="lmu-final-replacement" id={id}><p className="eyebrow">Choose a replacement</p><h3>{heading}</h3>{choices.map((choice, index) => <button key={choice.id} type="button" onClick={() => onChoose(index)}><span>{String(choice.rank).padStart(2, "0")}</span>{choice.title}</button>)}<button className="review-replace-cancel" type="button" onClick={onCancel}>Cancel</button></div>;
}
