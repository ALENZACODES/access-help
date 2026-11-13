export type Severity = "blocker" | "serious" | "minor";
export type Verdict = "PASS" | "PASS WITH FIXES" | "BLOCK";

export interface Defect {
  severity: Severity;
  location: string;
  reproduction: string;
  criterion?: string;
}

export interface ReviewPacket {
  reviewerRole: "reviewer";
  buildId: string;
  verdict: Verdict;
  readHelpArticles: boolean;
  checkedEndorsement: boolean;
  checkedMedicalAdvice: boolean;
  checkedUnknowns: boolean;
  checkedFrenchDraft: boolean;
  checkedNoMessaging: boolean;
  checkedCrisisNotStored: boolean;
  axeOutputRecorded: boolean;
  keyboardChecked: boolean;
  defects: Defect[];
  notes: string;
}

export interface ReviewItem {
  id: string;
  prompt: string;
}

/** The reviewer role from the master plan, Part 5: read what was built, test it, and block a merge. */
export const REVIEW_ITEMS: readonly ReviewItem[] = [
  { id: "R1", prompt: "State the build identifier that was reviewed." },
  { id: "R2", prompt: "Read the help articles, including French drafts. Do not approve unread text." },
  { id: "R3", prompt: "Look for endorsement, partnership, or invented brand names. A link is not a partnership." },
  { id: "R4", prompt: "Look for medical advice, eligibility decisions, and doses. The App must not give them." },
  { id: "R5", prompt: "Confirm unknowns stay Unknown and no prototype record is marked VERIFIED." },
  { id: "R6", prompt: "Confirm French is still marked as a draft until a Franco-Ontarian reviewer is named." },
  { id: "R7", prompt: "Confirm there is no messaging and no mentor matching." },
  { id: "R8", prompt: "Confirm crisis text is not stored and 911 is not behind a form." },
  { id: "R9", prompt: "Record axe output. State that it does not prove WCAG 2.2 AA." },
  { id: "R10", prompt: "Check the keyboard path: skip link first, visible focus, help article back, language switch." },
  { id: "R11", prompt: "File every defect with severity, location, and reproduction steps." },
  { id: "R12", prompt: "End with PASS, PASS WITH FIXES, or BLOCK. A block stands unless the human owner accepts the risk in writing." },
];

export function assessReview(packet: ReviewPacket): string[] {
  const gaps: string[] = [];
  if (!packet.buildId.trim()) gaps.push("R1");
  if (!packet.readHelpArticles) gaps.push("R2");
  if (!packet.checkedEndorsement) gaps.push("R3");
  if (!packet.checkedMedicalAdvice) gaps.push("R4");
  if (!packet.checkedUnknowns) gaps.push("R5");
  if (!packet.checkedFrenchDraft) gaps.push("R6");
  if (!packet.checkedNoMessaging) gaps.push("R7");
  if (!packet.checkedCrisisNotStored) gaps.push("R8");
  if (!packet.axeOutputRecorded) gaps.push("R9");
  if (!packet.keyboardChecked) gaps.push("R10");
  if (!packet.verdict) gaps.push("R12");
  for (const [index, defect] of packet.defects.entries()) {
    if (!defect.severity || !defect.location.trim() || !defect.reproduction.trim()) {
      gaps.push(`R11:${index}`);
    }
  }
  if (packet.verdict === "BLOCK" && packet.defects.length === 0) {
    gaps.push("R11:block-needs-a-defect");
  }
  if (packet.verdict === "PASS" && packet.defects.some((defect) => defect.severity === "blocker")) {
    gaps.push("R12:pass-with-a-blocker");
  }
  return gaps;
}
