# Five Voices Assessment

An original PurposeOS 25-statement reflection using the Nurturer, Creative, Guardian, Connector, and Pioneer category names. Public framework reference: https://5voices.com/ . The statements, descriptions, development suggestions, and scoring implementation were written for PurposeOS; they do not reproduce GiANT’s assessment or reports and do not represent its official instrument or scoring. No population norms or validated personality claims are made.

Five fixed questions per voice use the same internal 1–3 half-step scoring as APEST. Participants see Rarely, Occasionally, Sometimes, Often, and Always without point values. Order is shuffled and saved independently of question identity. Results retain all five totals internally, display descending ranks, preserve ties, and use dark blue for primary, light blue for secondary, and gray for other ranks. Completed retakes preserve earlier results.

The UI reuses APEST’s native shell and visual styles. It includes an introduction, five clickable progress steps, private authenticated saving, My Journey results, review/retake, response summaries, and existing export integration. Course embedding uses the existing reusable-assessment registration and launches `/experiences/five-voices`.

Provision only from the primary VS Code project using its configured environment: `node --env-file=.env.local scripts/create-five-voices-draft.mjs` for inspection. Adding `--apply --confirm=8c74ae51-b859-5314-be9a-f7ba0893e279` creates a private draft and native content. No image is selected; publication remains the owner’s action. The script refuses other owners of the slug and published versions. It never publishes.

Primary source repository: `/Users/gilesemery/Documents/Websites - Portals/Wayfinders/wayfinders-portal`. Deploy through GitHub main to Vercel, keeping this project synchronized.

Draft identities:
{
  "experience": "8c74ae51-b859-5314-be9a-f7ba0893e279",
  "version": "a614f110-151f-5671-903f-d8e4def26fac",
  "module": "cb7276b7-5753-528e-b690-d1ff5f2e7791",
  "lesson": "e8cf71ac-c717-5fa6-922a-d4a309f06afc",
  "section": "f4fa1d45-c686-5577-b99e-a186b9261047",
  "layout": "dab277de-5905-5f65-90ea-fb2830406351",
  "column": "fdb415ea-8539-5a98-9cea-53ea9d9f89ea",
  "block": "bd6df9bf-279b-5ce8-874d-dd87b13aa48b"
}
