import type { FollowUpRecord } from "./types.js";

/**
 * A synthetic Day 25 to 30 record used by tests and the QA harness. It is not
 * a record of a real demonstration. Dates are in the year 2000 and every text
 * says it is synthetic, so it cannot be mistaken for what SCIO said.
 */
export const SYNTHETIC_RECORD: FollowUpRecord = {
  format: "demo-follow-up-1.0.0",
  demoDay: {
    date: "2000-01-03",
    attendees: [
      { role: "human-owner", count: 1 },
      { role: "presenter", count: 1 },
      { role: "scio-attendee", count: 2 },
      { role: "reviewer", count: 1 },
    ],
    build: { id: "synthetic-build-1", unchangedDuringSession: true, fallbackUsed: false },
    durationMinutes: 31,
    sectionsShown: ["Synthetic section: home and data status", "Synthetic section: journey", "Synthetic section: offline pack"],
    honestyStatements: {
      "prototype-status": true,
      "unverified-data": true,
      "demonstration-outage-data": true,
      "no-endorsement": true,
      "no-medical-advice": true,
      "french-shell-limit": true,
    },
    questions: [
      {
        id: "Q01",
        question: "Synthetic question: how many washrooms are seeded?",
        answerGiven: "Synthetic answer: the count on the data-status page, all unverified.",
        answerKind: "answered",
        followUp: { kind: "none", note: "Synthetic: answered from the build in the room." },
        recordingAgreed: true,
      },
      {
        id: "Q02",
        question: "Synthetic question: which licences cover the transit data?",
        answerGiven: "Synthetic answer: deferred, because some terms are not settled.",
        answerKind: "deferred",
        followUp: { kind: "promised", action: "Synthetic: send the licence position per source.", owner: "builder", due: "2000-01-10" },
        recordingAgreed: true,
      },
      {
        id: "Q03",
        question: "Synthetic question: could the outage list come from the operator?",
        answerGiven: "Synthetic answer: that is a decision for SCIO and the operator, not the team.",
        answerKind: "deferred",
        followUp: { kind: "promised", action: "Synthetic: list what an operator feed would need.", owner: "human-owner", due: "2000-01-14" },
        recordingAgreed: true,
      },
    ],
    gate4: {
      criteria: {
        "demonstration-delivery": "continue",
        "data-honesty": "continue",
        "scio-engagement": "continue",
        "build-stability": "continue",
        "record-accuracy": "continue",
      },
      decision: "continue",
      decidedBy: "human-owner",
      scioAskedNext: "Synthetic: the licence position and what an operator feed would need.",
      nextSteps: "Synthetic: triage follow-ups on Day 26 and fix defects on Days 27 and 28.",
    },
  },
  thankYou: [
    {
      language: "en",
      text: "Synthetic note. Thank you for the time. We showed a prototype for evaluation. No data shown is verified. Follow-ups: Q02 and Q03.",
      followUpIds: ["Q02", "Q03"],
    },
    {
      language: "fr",
      text: "Note synthétique. Merci de votre temps. Nous avons montré un prototype à évaluer. Aucune donnée montrée n'est vérifiée. Suivis : Q02 et Q03.",
      followUpIds: ["Q02", "Q03"],
    },
  ],
  triage: {
    date: "2000-01-04",
    items: [
      { id: "T01", origin: { kind: "question", ref: "Q02" }, summary: "Synthetic: licence position per source.", disposition: "needs-fresh-evidence", owner: "builder", due: "2000-01-10" },
      { id: "T02", origin: { kind: "question", ref: "Q03" }, summary: "Synthetic: operator feed for outages.", disposition: "scio-decision", owner: "human-owner", due: "2000-01-14" },
      { id: "T03", origin: { kind: "request", ref: "Q01" }, summary: "Synthetic: seeded washroom count by tier.", disposition: "answer-from-evidence", owner: "builder", due: "2000-01-07" },
      { id: "T04", origin: { kind: "defect", ref: "D01" }, summary: "Synthetic: focus lost after the journey loads.", disposition: "fix", owner: "builder", due: "2000-01-05" },
    ],
  },
  defects: [
    {
      id: "D01",
      severity: "serious",
      summary: "Synthetic: focus lost after the journey loads.",
      origin: "demonstration-fallback",
      foundOnBuild: "synthetic-build-1",
      fix: { build: "synthetic-build-2", retest: { build: "synthetic-build-2", result: "pass", date: "2000-01-05", role: "reviewer" } },
    },
    {
      id: "D02",
      severity: "moderate",
      summary: "Synthetic: carried contrast defect on a badge.",
      origin: "gate-3-carried",
      foundOnBuild: "synthetic-build-0",
      plan: { owner: "builder", due: "2000-01-20", note: "Synthetic: change the badge colour and re-test." },
    },
  ],
  regressionRuns: [
    {
      format: "regression-run-1.0.0",
      repository: "synthetic-repository",
      buildId: "synthetic-build-2",
      ranOn: "2000-01-06",
      checks: [
        { id: "G1-journey", gate: "Gate 1", title: "Synthetic journey check", status: "pass", buildId: "synthetic-build-2" },
        { id: "G2-outage", gate: "Gate 2", title: "Synthetic outage check", status: "not-run", buildId: "synthetic-build-2", reason: "Synthetic: not in this repository." },
      ],
    },
  ],
  answers: [
    {
      itemId: "T03",
      text: {
        en: "Synthetic answer: the washroom count is on the data-status page of the build. Every record is unverified.",
        fr: "Réponse synthétique : le nombre de toilettes est sur la page d'état des données. Aucune fiche n'est vérifiée.",
      },
      citations: [{ kind: "seed-count", ref: "synthetic counts file" }],
      approval: "approved",
      approvedBy: "human-owner",
      sent: false,
    },
  ],
  checkIn: {
    date: "2000-01-07",
    decisions: [{ text: "Synthetic: hold the operator question until SCIO decides.", decidedBy: "human-owner" }],
    checks: [{ itemId: "T01", evidenceNeeded: "Synthetic: current licence page per source.", openedOn: "2000-01-07", owner: "builder", due: "2000-01-10" }],
    deepSample: { status: "under-way" },
  },
};
