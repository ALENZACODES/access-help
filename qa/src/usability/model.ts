import type { Severity } from "../audit/model.js";

/**
 * Day 18 usability sessions. This module holds the task set, the consent
 * checklist, and validators. It holds no session data. Sessions are run by
 * people and recorded in qa/usability/sessions/ as JSON, one file each.
 */

export type Language = "en" | "fr";

export interface UsabilityTask {
  id: string;
  /** What the facilitator reads out. It names a goal, not the control to press. */
  prompt: Record<Language, string>;
  /** What counts as done. */
  successWhen: Record<Language, string>;
}

export const TASK_SET_VERSION = "centre-tasks-1.0.0";

export const TASK_SET: readonly UsabilityTask[] = [
  {
    id: "T1",
    prompt: {
      en: "Find out what the App does not do with information about places.",
      fr: "Trouvez ce que l'application ne fait pas avec l'information sur les lieux.",
    },
    successWhen: {
      en: "The person reaches the Labels and unknowns article and reads its does-not section.",
      fr: "La personne arrive à l'article sur les étiquettes et les inconnus et lit la partie sur ce que l'application ne fait pas.",
    },
  },
  {
    id: "T2",
    prompt: { en: "Change the language to French, then back to English.", fr: "Passez au français, puis revenez à l'anglais." },
    successWhen: {
      en: "The interface is shown in French, then in English.",
      fr: "L'interface s'affiche en français, puis en anglais.",
    },
  },
  {
    id: "T3",
    prompt: {
      en: "Find where you would go to learn about peer support from Spinal Cord Injury Ontario.",
      fr: "Trouvez où aller pour en savoir plus sur le soutien par les pairs de Lésions Médullaires Ontario.",
    },
    successWhen: {
      en: "The person reaches the peer support link in the community directory.",
      fr: "La personne arrive au lien sur le soutien par les pairs dans le répertoire communautaire.",
    },
  },
  {
    id: "T4",
    prompt: {
      en: "Open a demonstration event and find where registration happens.",
      fr: "Ouvrez un événement de démonstration et trouvez où se fait l'inscription.",
    },
    successWhen: {
      en: "The person reaches the external registration link and can say registration is not in the App.",
      fr: "La personne arrive au lien d'inscription externe et peut dire que l'inscription ne se fait pas dans l'application.",
    },
  },
  {
    id: "T5",
    prompt: { en: "Find the build identifier of this version.", fr: "Trouvez l'identifiant de version." },
    successWhen: {
      en: "The person reads the build identifier aloud from the banner or the About screen.",
      fr: "La personne lit l'identifiant de version dans la bannière ou l'écran À propos.",
    },
  },
];

export interface ConsentItem {
  id: "consent" | "right-to-stop" | "no-travel" | "no-health-details";
  text: Record<Language, string>;
}

/** Read to the participant before the session. Each item is ticked by the facilitator. */
export const CONSENT_CHECKLIST: readonly ConsentItem[] = [
  {
    id: "consent",
    text: {
      en: "You agree to take part in this session, and to notes being taken without your name.",
      fr: "Vous acceptez de participer à cette séance, et que des notes soient prises sans votre nom.",
    },
  },
  {
    id: "right-to-stop",
    text: {
      en: "You can stop at any time, skip any task, and ask for your notes to be deleted. You do not have to give a reason.",
      fr: "Vous pouvez arrêter à tout moment, sauter une tâche, et demander que vos notes soient supprimées. Vous n'avez pas à donner de raison.",
    },
  },
  {
    id: "no-travel",
    text: {
      en: "You do not have to travel. The session can run on your own device, where you are.",
      fr: "Vous n'avez pas à vous déplacer. La séance peut se faire sur votre propre appareil, là où vous êtes.",
    },
  },
  {
    id: "no-health-details",
    text: {
      en: "We will not ask about your health, injury, or care, and we will not write any of it down. Please do not share it.",
      fr: "Nous ne poserons pas de questions sur votre santé, votre blessure ou vos soins, et nous n'en noterons rien. Merci de ne pas en parler.",
    },
  },
];

export interface Finding {
  taskId: string;
  /** What the person did, in the facilitator's words. */
  behaviour: string;
  /** What the person said, paraphrased. Not a verbatim quote. */
  paraphrase: string;
  severity: Severity;
  /** The proposed fix. */
  fix: string;
}

export interface SessionRecord {
  schemaVersion: "usability-session-1.0.0";
  /** Anonymous id such as "S1". Not a name or initials. */
  sessionId: string;
  buildId: string;
  taskSetVersion: string;
  /** Date only. No time, so a session cannot be matched to a calendar. */
  date: string;
  language: Language;
  /** Input the person chose to use, in general terms. Optional. Not a health detail. */
  inputMethod?: "keyboard" | "switch" | "voice" | "eye-gaze" | "touch" | "mouse" | "screen-reader" | "other";
  consent: Record<ConsentItem["id"], boolean>;
  tasksAttempted: string[];
  findings: Finding[];
}

export interface UsabilityIssue {
  sessionId: string;
  rule: string;
  detail: string;
}

const ALLOWED_KEYS = new Set([
  "schemaVersion", "sessionId", "buildId", "taskSetVersion", "date", "language", "inputMethod", "consent", "tasksAttempted", "findings",
]);
const FINDING_KEYS = new Set(["taskId", "behaviour", "paraphrase", "severity", "fix"]);

/** Identity details that must not appear in a session file. */
const IDENTITY_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { id: "phone", pattern: /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/ },
  { id: "postal-code", pattern: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/i },
  { id: "age", pattern: /\b\d{1,3}[- ]?(years?|yrs?)[- ]old\b|\b(âgée?|age[d]?) (de )?\d{1,3}\b|\b\d{1,3} ans\b/i },
  { id: "named-person", pattern: /\b(Mr|Mrs|Ms|Mx|Dr|M\.|Mme)\.? [A-Z][a-z]+/ },
];

/** Health details that must not appear in a session file. */
const HEALTH_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: "injury-level", pattern: /\b[CTLS][1-9]\d?\b(?:[-–][CTLS]?\d{1,2})?|\bASIA\b|\bAIS [A-E]\b|\b(tetra|quadri|para)pl[eé]gi/i },
  { id: "diagnosis", pattern: /diagnos|incomplete injury|complete injury|l[ée]sion (in)?compl[eè]te/i },
  { id: "body-function", pattern: /bladder|bowel|cathet|vessie|intestin|sond(e|age)|pressure (sore|injur)|plaie de pression|dysreflexi|dysr[ée]flexi/i },
  { id: "medication", pattern: /medicat|m[ée]dicament|baclofen|\bdose\b|prescri/i },
  { id: "pain-or-symptom", pattern: /\bpain\b|\bdouleur|spasm|spasticit|fatigue d|symptom|sympt[oô]me/i },
];

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join("\n");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join("\n");
  return "";
}

export function validateSession(input: unknown): UsabilityIssue[] {
  const record = (input ?? {}) as Partial<SessionRecord> & Record<string, unknown>;
  const sessionId = typeof record.sessionId === "string" ? record.sessionId : "(no id)";
  const issues: UsabilityIssue[] = [];
  const add = (rule: string, detail: string) => issues.push({ sessionId, rule, detail });

  for (const key of Object.keys(record)) if (!ALLOWED_KEYS.has(key)) add("unknown-field", `Field "${key}" is not allowed. Sessions hold no identity or health detail.`);
  if (record.schemaVersion !== "usability-session-1.0.0") add("schema", "schemaVersion must be usability-session-1.0.0.");
  if (!/^S\d{1,3}$/.test(sessionId)) add("anonymous-id", "sessionId must be S followed by a number, such as S1.");
  if (typeof record.buildId !== "string" || !record.buildId.trim()) add("build-id", "The build identifier tested is missing.");
  if (record.taskSetVersion !== TASK_SET_VERSION) add("task-set", `taskSetVersion must be ${TASK_SET_VERSION}.`);
  if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) add("date", "date must be YYYY-MM-DD, with no time.");
  if (record.language !== "en" && record.language !== "fr") add("language", "language must be en or fr.");

  for (const item of CONSENT_CHECKLIST) {
    if (record.consent?.[item.id] !== true) add("consent", `Consent item "${item.id}" is not ticked. Do not record a session without it.`);
  }

  const taskIds = new Set(TASK_SET.map((task) => task.id));
  const attempted = Array.isArray(record.tasksAttempted) ? record.tasksAttempted : [];
  if (attempted.length === 0) add("tasks", "No task from the task set was attempted.");
  for (const id of attempted) if (!taskIds.has(id)) add("tasks", `Task ${id} is not in ${TASK_SET_VERSION}.`);

  const findings = Array.isArray(record.findings) ? record.findings : [];
  findings.forEach((finding, index) => {
    const label = `Finding ${index + 1}`;
    for (const key of Object.keys(finding ?? {})) if (!FINDING_KEYS.has(key)) add("finding-field", `${label} has field "${key}", which is not allowed.`);
    if (!taskIds.has(finding?.taskId)) add("finding-task", `${label} names no task from the task set.`);
    if (!attempted.includes(finding?.taskId)) add("finding-task", `${label} names task ${finding?.taskId}, which was not attempted.`);
    for (const field of ["behaviour", "paraphrase", "fix"] as const) {
      if (typeof finding?.[field] !== "string" || finding[field].trim().length < 8) add(`finding-${field}`, `${label} needs a ${field}.`);
    }
    if (!["blocker", "serious", "minor"].includes(finding?.severity)) add("finding-severity", `${label} needs a severity: blocker, serious, or minor.`);
    if (typeof finding?.paraphrase === "string" && /["“”«»]/.test(finding.paraphrase)) {
      add("finding-paraphrase", `${label} paraphrase contains quotation marks. Paraphrase, do not quote.`);
    }
  });

  // Only free text can carry identity or health detail. Ids such as S1 and T1 are fixed formats checked above.
  const text = textOf(findings.map((finding) => [finding?.behaviour, finding?.paraphrase, finding?.fix]));
  for (const rule of IDENTITY_PATTERNS) if (rule.pattern.test(text)) add("identity", `Possible identity detail (${rule.id}). Remove it.`);
  for (const rule of HEALTH_PATTERNS) if (rule.pattern.test(text)) add("health", `Possible health detail (${rule.id}). Remove it.`);
  return issues;
}

export interface FixItem {
  severity: Severity;
  taskId: string;
  fix: string;
  /** Anonymous ids of the sessions where it was seen. */
  seenIn: string[];
}

const RANK: Record<Severity, number> = { blocker: 0, serious: 1, minor: 2 };

/**
 * One list of fixes, blockers first, then serious, then minor. The same fix
 * for the same task is merged and keeps its worst severity. Within a
 * severity, fixes seen in more sessions come first.
 */
export function prioritiseFixes(sessions: readonly SessionRecord[]): FixItem[] {
  const merged = new Map<string, FixItem>();
  for (const session of sessions) {
    for (const finding of session.findings) {
      const key = `${finding.taskId}\u0000${finding.fix.trim().toLowerCase()}`;
      const current = merged.get(key);
      if (!current) {
        merged.set(key, { severity: finding.severity, taskId: finding.taskId, fix: finding.fix.trim(), seenIn: [session.sessionId] });
        continue;
      }
      if (RANK[finding.severity] < RANK[current.severity]) current.severity = finding.severity;
      if (!current.seenIn.includes(session.sessionId)) current.seenIn.push(session.sessionId);
    }
  }
  return [...merged.values()].sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || b.seenIn.length - a.seenIn.length || a.taskId.localeCompare(b.taskId) || a.fix.localeCompare(b.fix),
  );
}

export interface UsabilitySummary {
  sessions: number;
  enoughSessions: boolean;
  buildMatches: boolean;
  buildsSeen: string[];
  issues: UsabilityIssue[];
  fixes: FixItem[];
}

/** The Day 18 report: at least three valid sessions, all on the build that was tested. */
export function summariseUsability(inputs: readonly unknown[], testedBuildId: string): UsabilitySummary {
  const issues = inputs.flatMap((input) => validateSession(input));
  const valid = inputs.filter((input) => validateSession(input).length === 0) as SessionRecord[];
  const ids = valid.map((session) => session.sessionId);
  for (const id of new Set(ids)) {
    if (ids.filter((item) => item === id).length > 1) issues.push({ sessionId: id, rule: "duplicate", detail: `Session id ${id} is used twice.` });
  }
  const buildsSeen = [...new Set(valid.map((session) => session.buildId))];
  return {
    sessions: valid.length,
    enoughSessions: valid.length >= 3,
    buildMatches: valid.length > 0 && buildsSeen.length === 1 && buildsSeen[0] === testedBuildId,
    buildsSeen,
    issues,
    fixes: prioritiseFixes(valid),
  };
}
