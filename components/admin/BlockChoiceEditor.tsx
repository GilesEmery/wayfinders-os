"use client";

import { useState } from "react";

type Choice = { id: number; key: string; label: string; description: string };

export function BlockChoiceEditor({ options, multi, min, max }: { options: Choice[]; multi: boolean; min: number; max: number }) {
  const [choices, setChoices] = useState(options);
  const [nextId, setNextId] = useState(Math.max(0, ...options.map((choice) => choice.id)) + 1);
  const change = (id: number, field: "label" | "description", value: string) => setChoices((current) => current.map((choice) => choice.id === id ? { ...choice, [field]: value } : choice));
  const move = (index: number, offset: number) => setChoices((current) => {
    const target = index + offset;
    if (target < 0 || target >= current.length) return current;
    const copy = [...current];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
  });
  return <fieldset className="builder-option-editor is-wide"><legend>Choices</legend><p className="admin-field-note">Add the answers participants can choose. Drag-free ordering keeps this editor keyboard-friendly. Existing choice identities stay stable when labels change.</p>
    {choices.map((choice, index) => <div className="builder-option-row" key={choice.id}>
      <input type="hidden" name={`option_enabled_${index}`} value="on"/><input type="hidden" name={`option_key_${index}`} value={choice.key}/><input type="hidden" name={`option_order_${index}`} value={index}/>
      <label>Choice {index + 1}<input name={`option_label_${index}`} value={choice.label} onChange={(event) => change(choice.id, "label", event.target.value)} maxLength={160} required/></label>
      <label>Help text (optional)<input name={`option_description_${index}`} value={choice.description} onChange={(event) => change(choice.id, "description", event.target.value)} maxLength={300}/></label>
      <div className="builder-block-order"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move choice ${index + 1} up`}>↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === choices.length - 1} aria-label={`Move choice ${index + 1} down`}>↓</button><button type="button" onClick={() => setChoices((current) => current.filter((item) => item.id !== choice.id))} aria-label={`Remove choice ${index + 1}`}>×</button></div>
    </div>)}
    <button type="button" onClick={() => { setChoices((current) => [...current, { id: nextId, key: "", label: "", description: "" }]); setNextId(nextId + 1); }}>+ Add choice</button>
    {multi && <div className="builder-option-limits"><label>Minimum choices<input name="min_selections" defaultValue={min} type="number" min="0" max={choices.length} required/></label><label>Maximum choices<input name="max_selections" defaultValue={max} type="number" min="1" max={choices.length} required/></label></div>}
  </fieldset>;
}
