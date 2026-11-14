import type { Disposition, OwnerRole } from "../types.js";

export type Language = "en" | "fr";

/** French is a draft pending review by a French-language editor, like the rest of the centre. */
export const DESK_STRINGS = {
  en: {
    title: "Demo follow-up",
    lead: "Team tool for the questions log and the follow-up tracker. Entries stay on this device until you copy them out. Nothing is sent. Write roles, not names.",
    memoryOnly: "This browser does not allow saving. Entries last until this page closes.",
    addHeading: "Add a question",
    errorsHeading: "Fix these before the question is added:",
    question: "Question asked",
    answerGiven: "Answer given in the room",
    answerHint: "Write what was said. If it could not be answered honestly, say so and choose Deferred.",
    answerKind: "Was it answered?",
    answered: "Answered",
    deferred: "Deferred",
    followUpKind: "Follow-up",
    promised: "Follow-up promised",
    none: "No follow-up",
    action: "Follow-up action",
    owner: "Owner",
    due: "Due date",
    note: "Why no follow-up is needed",
    recordingAgreed: "SCIO agreed this question can be recorded.",
    add: "Add to the log",
    added: (id: string) => `${id} added to the log.`,
    logHeading: "Questions log",
    empty: "No questions are recorded on this device.",
    triageFor: (id: string) => `Triage for ${id}`,
    disposition: "Disposition",
    reason: "Reason for declining",
    choose: "Choose",
    delete: (id: string) => `Delete ${id}`,
    confirmDelete: (id: string) => `Delete ${id} from this device?`,
    yesDelete: "Yes, delete",
    cancel: "Cancel",
    deleted: (id: string) => `${id} deleted.`,
    checksHeading: "Tracker checks",
    checksClear: "Every promised follow-up has a disposition, an owner, and a due date.",
    exportHeading: "Copy out",
    showMarkdown: "Show the tracker as text",
    hideMarkdown: "Hide the tracker text",
    markdownLabel: "Tracker and questions log as Markdown",
    clearAll: "Delete every entry on this device",
    confirmClear: "Delete every question and triage entry on this device?",
    cleared: "Every entry on this device was deleted.",
    followUpNone: "No follow-up",
    deferredLabel: "Deferred",
    answeredLabel: "Answered",
  },
  fr: {
    title: "Suivi de la démonstration",
    lead: "Outil d'équipe pour le registre des questions et le suivi. Les entrées restent sur cet appareil jusqu'à ce que vous les copiiez. Rien n'est envoyé. Inscrivez des rôles, pas des noms.",
    memoryOnly: "Ce navigateur ne permet pas l'enregistrement. Les entrées durent jusqu'à la fermeture de cette page.",
    addHeading: "Ajouter une question",
    errorsHeading: "Corrigez ces points avant d'ajouter la question :",
    question: "Question posée",
    answerGiven: "Réponse donnée dans la salle",
    answerHint: "Écrivez ce qui a été dit. S'il était impossible de répondre honnêtement, dites-le et choisissez Reportée.",
    answerKind: "A-t-on répondu?",
    answered: "Répondue",
    deferred: "Reportée",
    followUpKind: "Suivi",
    promised: "Suivi promis",
    none: "Aucun suivi",
    action: "Action de suivi",
    owner: "Responsable",
    due: "Date d'échéance",
    note: "Pourquoi aucun suivi n'est nécessaire",
    recordingAgreed: "Lésions Médullaires Ontario a accepté que cette question soit consignée.",
    add: "Ajouter au registre",
    added: (id: string) => `${id} ajoutée au registre.`,
    logHeading: "Registre des questions",
    empty: "Aucune question n'est consignée sur cet appareil.",
    triageFor: (id: string) => `Tri pour ${id}`,
    disposition: "Décision de tri",
    reason: "Raison du refus",
    choose: "Choisir",
    delete: (id: string) => `Supprimer ${id}`,
    confirmDelete: (id: string) => `Supprimer ${id} de cet appareil?`,
    yesDelete: "Oui, supprimer",
    cancel: "Annuler",
    deleted: (id: string) => `${id} supprimée.`,
    checksHeading: "Vérifications du suivi",
    checksClear: "Chaque suivi promis a une décision de tri, un responsable et une date d'échéance.",
    exportHeading: "Copier",
    showMarkdown: "Afficher le suivi en texte",
    hideMarkdown: "Masquer le texte du suivi",
    markdownLabel: "Suivi et registre des questions en Markdown",
    clearAll: "Supprimer toutes les entrées de cet appareil",
    confirmClear: "Supprimer toutes les questions et tous les tris de cet appareil?",
    cleared: "Toutes les entrées de cet appareil ont été supprimées.",
    followUpNone: "Aucun suivi",
    deferredLabel: "Reportée",
    answeredLabel: "Répondue",
  },
} as const;

export const OWNER_LABELS: Record<Language, Record<OwnerRole, string>> = {
  en: { "human-owner": "Human owner", integrator: "Integrator", builder: "Builder", reviewer: "Reviewer" },
  fr: { "human-owner": "Propriétaire humain", integrator: "Intégrateur", builder: "Développeur", reviewer: "Réviseur" },
};

export const DISPOSITION_LABELS: Record<Language, Record<Disposition, string>> = {
  en: {
    "answer-from-evidence": "Answer from existing evidence",
    "needs-fresh-evidence": "Needs fresh evidence",
    fix: "Fix",
    "carry-with-plan": "Carry with a dated plan",
    "decline-with-reason": "Decline with a reason",
    "scio-decision": "Question for SCIO to decide",
  },
  fr: {
    "answer-from-evidence": "Répondre avec les preuves existantes",
    "needs-fresh-evidence": "Exige de nouvelles preuves",
    fix: "Corriger",
    "carry-with-plan": "Reporter avec un plan daté",
    "decline-with-reason": "Refuser avec une raison",
    "scio-decision": "Question à trancher par Lésions Médullaires Ontario",
  },
};

/** Plain-language messages for form problems, by defect rule. */
export const PROBLEM_MESSAGES: Record<Language, Record<string, string>> = {
  en: {
    "recording-not-agreed": "Only record a question SCIO agreed can be recorded.",
    question: "Write the question.",
    answer: "Write the answer given, or say it was deferred.",
    "follow-up-missing": "Choose whether a follow-up was promised.",
    "deferred-without-follow-up": "A deferred question needs a promised follow-up.",
    "no-follow-up-note": "Say why no follow-up is needed.",
    "follow-up-action": "Write the follow-up action.",
    "follow-up-owner": "Choose who owns the follow-up.",
    "follow-up-due": "Choose a due date.",
    privacy: "Remove the email address, phone number, or postal code.",
    claim: "This wording claims an endorsement, verification, live data, or a health benefit. Write what the build shows.",
    "text-placeholder": "Replace the placeholder with what was said.",
  },
  fr: {
    "recording-not-agreed": "Ne consignez qu'une question que Lésions Médullaires Ontario a accepté de faire consigner.",
    question: "Écrivez la question.",
    answer: "Écrivez la réponse donnée, ou indiquez qu'elle a été reportée.",
    "follow-up-missing": "Indiquez si un suivi a été promis.",
    "deferred-without-follow-up": "Une question reportée exige un suivi promis.",
    "no-follow-up-note": "Expliquez pourquoi aucun suivi n'est nécessaire.",
    "follow-up-action": "Écrivez l'action de suivi.",
    "follow-up-owner": "Choisissez le responsable du suivi.",
    "follow-up-due": "Choisissez une date d'échéance.",
    privacy: "Retirez l'adresse courriel, le numéro de téléphone ou le code postal.",
    claim: "Ce texte affirme une approbation, une vérification, des données en direct ou un bienfait pour la santé. Écrivez ce que montre la version.",
    "text-placeholder": "Remplacez l'espace réservé par ce qui a été dit.",
  },
};

export function problemMessage(language: Language, rule: string): string {
  const messages = PROBLEM_MESSAGES[language];
  if (messages[rule]) return messages[rule];
  if (rule === "text-email" || rule === "text-phone" || rule === "text-postal-code") return messages.privacy!;
  return messages.claim!;
}

/** Plain-language messages for tracker checks. */
export function trackerMessage(language: Language, rule: string, ref: string): string {
  const en: Record<string, string> = {
    "follow-up-untriaged": `${ref}: the promised follow-up has no disposition yet.`,
    owner: `${ref}: choose an owner.`,
    due: `${ref}: choose a due date.`,
    "due-before-triage": `${ref}: the due date is before today.`,
    "decline-reason": `${ref}: a declined item needs a reason.`,
    "scio-decision-owner": `${ref}: the human owner raises questions for SCIO to decide.`,
  };
  const fr: Record<string, string> = {
    "follow-up-untriaged": `${ref} : le suivi promis n'a pas encore de décision de tri.`,
    owner: `${ref} : choisissez un responsable.`,
    due: `${ref} : choisissez une date d'échéance.`,
    "due-before-triage": `${ref} : la date d'échéance est avant aujourd'hui.`,
    "decline-reason": `${ref} : un refus exige une raison.`,
    "scio-decision-owner": `${ref} : le propriétaire humain soumet les questions à trancher par Lésions Médullaires Ontario.`,
  };
  return (language === "fr" ? fr : en)[rule] ?? `${ref}: ${rule}`;
}
