# Usability session records

One JSON file per session, named `S<number>.json`. Files are checked by `validateSession` in `qa/src/usability/model.ts` and counted by `npm run check`.

No session has been run for this repository yet. The folder holds no records, and the Day 18 checks report that rather than pass.

- Read the consent checklist first. Do not record a session unless every item is ticked.
- `sessionId` is `S1`, `S2`, and so on. No names, initials, email, phone, age, or postal code.
- No health detail: no injury level, diagnosis, body function, medication, pain, or symptom. The validator rejects common forms of these, but a person still has to read each file.
- `paraphrase` is your summary of what the person said. Do not quote them.
- `buildId` is the identifier shown on the banner of the build you tested.

`TEMPLATE.json.txt` is a blank shape to copy. It is not a session and is not counted.
