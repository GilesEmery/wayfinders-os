"use client";

export type AssignmentCheckboxOption = {
  id: string;
  label: string;
  description?: string | null;
  checked: boolean;
  locked?: boolean;
  archived?: boolean;
  detail?: string;
};

export function AssignmentCheckboxGroup({ legend, options, busy, onChange }: {
  legend: string;
  options: AssignmentCheckboxOption[];
  busy: boolean;
  onChange: (option: AssignmentCheckboxOption, checked: boolean) => void;
}) {
  return <fieldset className="admin-assignment-checkboxes" disabled={busy}>
    <legend>{legend}</legend>
    {options.map((option) => <label className={option.locked ? "is-locked" : undefined} key={option.id}>
      <input checked={option.checked} disabled={option.locked || (option.archived && !option.checked)} onChange={(event) => onChange(option, event.target.checked)} type="checkbox"/>
      <span><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}{option.detail ? <small>{option.detail}</small> : null}</span>
      {option.locked ? <em>Locked</em> : option.archived ? <em>Archived</em> : null}
    </label>)}
  </fieldset>;
}
