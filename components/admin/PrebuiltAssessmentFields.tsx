"use client";

import { useState } from "react";

type AssessmentOption = Readonly<{
  id: string;
  name: string;
  description: string;
}>;

export function PrebuiltAssessmentFields({
  assessments,
  initialAssessmentId,
  initialTitle,
  initialDescription,
}: {
  assessments: AssessmentOption[];
  initialAssessmentId: string;
  initialTitle: string;
  initialDescription: string;
}) {
  const [assessmentId, setAssessmentId] = useState(initialAssessmentId);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  function selectAssessment(id: string) {
    const selected = assessments.find((assessment) => assessment.id === id);
    setAssessmentId(id);
    setTitle(selected?.name ?? "");
    setDescription(selected?.description ?? "");
  }

  return <>
    <label className="is-wide">Prebuilt Assessment
      <select name="assessment_experience_id" value={assessmentId} onChange={(event) => selectAssessment(event.target.value)} required>
        <option value="" disabled>Choose an Assessment</option>
        {assessments.map((assessment) => <option value={assessment.id} key={assessment.id}>{assessment.name}</option>)}
      </select>
      <span className="admin-field-note">The Guided Experience retains its own design, responses, scoring, results, and standalone availability.</span>
    </label>
    <label className="is-wide">Display title (optional)
      <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200}/>
    </label>
    <label className="is-wide">Introduction (optional)
      <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3}/>
    </label>
  </>;
}
