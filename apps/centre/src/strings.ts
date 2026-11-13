/**
 * Shell strings for the help centre. Every English key has French.
 * Help articles are separate records, not these short labels.
 * This module does not fetch anything.
 */
export const SHELL_STRINGS = {
  en: {
    skip: "Skip to main content",
    appName: "the App",
    prototype: "Prototype. Not an official service. Counts and places in other parts of the App are not loaded here.",
    help: "Help",
    community: "Community",
    events: "Events",
    safety: "Safety",
    about: "About",
    call911: "Call 911",
    languageGroup: "Language",
    english: "English",
    french: "Français",
    languageNow: "Current language: English",
    offline: "You are offline. Live status is unavailable. Saved help can still be read. Elevator status may have changed.",
    back: "Back to help",
    practiceLink: "Practice the review steps on this device. This is not a live community.",
    homeLead: "Plain-language help in English and French. Search works on this device, including offline after the pack is saved.",
    articlesHeading: "Articles",
  },
  fr: {
    skip: "Aller au contenu principal",
    appName: "l'App",
    prototype: "Prototype. Pas un service officiel. Les comptes et les lieux des autres parties de l'App ne sont pas chargés ici.",
    help: "Aide",
    community: "Communauté",
    events: "Événements",
    safety: "Sécurité",
    about: "À propos",
    call911: "Appeler le 911",
    languageGroup: "Langue",
    english: "English",
    french: "Français",
    languageNow: "Langue actuelle : français",
    offline: "Vous êtes hors ligne. L'état en direct n'est pas disponible. L'aide enregistrée peut encore être lue. L'état des ascenseurs peut avoir changé.",
    back: "Retour à l'aide",
    practiceLink: "Exercer les étapes de revue sur cet appareil. Ce n'est pas une communauté en service.",
    homeLead: "Aide en langage clair, en français et en anglais. La recherche fonctionne sur cet appareil, y compris hors ligne après l'enregistrement du paquet.",
    articlesHeading: "Articles",
  },
} as const;

export type ShellKey = keyof typeof SHELL_STRINGS.en;

export function shellString(language: "en" | "fr", key: ShellKey): string {
  return SHELL_STRINGS[language][key];
}

export function missingFrenchKeys(): string[] {
  const english = Object.keys(SHELL_STRINGS.en);
  return english.filter((key) => !(key in SHELL_STRINGS.fr) || SHELL_STRINGS.fr[key as ShellKey].trim() === "");
}
