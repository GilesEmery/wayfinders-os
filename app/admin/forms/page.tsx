import { AdminArchitecturePage } from "@/components/admin/AdminArchitecturePage";

export default function Page() {
  return <AdminArchitecturePage eyebrow="Engagement" title="Forms" description="General-purpose structured information collection, distinct from Assessments and Experience inputs." sections={[
    { title: "Form registry", description: "Applications, interest forms, intake, feedback, surveys, requests, inquiries, questionnaires, and acknowledgements become configurable Forms." },
    { title: "Builder", description: "Versioned sections and fields will support validation, access, and responsive respondent experiences without hard-coded form tables." },
    { title: "Submissions", description: "Authorized reviewers can find, review, classify, and link submissions to existing canonical Purpose OS records." },
  ]}/>;
}
