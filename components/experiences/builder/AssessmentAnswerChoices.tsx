"use client";

type Props = {
  id: string;
  value?: number;
  options: readonly { value: number; label: string }[];
  disabled?: boolean;
  onChange: (value: number) => void;
};

/** No visual or stored answer exists until the participant selects a choice. */
export function AssessmentAnswerChoices({ id, value, options, disabled, onChange }: Props) {
  return <div className="assessment-answer-options">
    {options.map(option => <label key={option.value} className={value === option.value ? "is-selected" : ""}>
      <input id={`${id}-${option.value}`} name={id} type="radio" value={option.value} checked={value === option.value} disabled={disabled} onChange={() => onChange(option.value)}/>
      <span>{option.label}</span>
    </label>)}
  </div>;
}
