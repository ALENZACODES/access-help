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
    notFoundTitle: "Page not found",
    notFoundBody: "That address is not part of the help centre. Check the address, or use one of these links.",
    articleNotFoundTitle: "Article not found",
    articleNotFoundBody: "No help article has that address. It may have been renamed. Search help or open the list of articles.",
    openHelp: "Open help",
    openAbout: "Open About",
  },
  fr: {
    skip: "Aller au contenu principal",
    appName: "l'application",
    prototype: "Prototype. Pas un service officiel. Les comptes et les lieux des autres parties de l'application ne sont pas chargés ici.",
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
    notFoundTitle: "Page introuvable",
    notFoundBody: "Cette adresse ne fait pas partie du centre d'aide. Vérifiez l'adresse, ou utilisez l'un de ces liens.",
    articleNotFoundTitle: "Article introuvable",
    articleNotFoundBody: "Aucun article d'aide n'a cette adresse. Il a peut-être été renommé. Cherchez dans l'aide ou ouvrez la liste des articles.",
    openHelp: "Ouvrir l'aide",
    openAbout: "Ouvrir À propos",
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
