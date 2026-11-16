/**
 * Strings for the event-night screens (/event-night). Every English key has a French twin.
 * French uses U+2019 for the apostrophe and U+00A0 before a colon.
 * The views themselves bring their own text from their packages; these are the menu,
 * the landing screen and the event picker.
 */
const N = " ";

export const EVENT_NIGHT_STRINGS = {
  en: {
    nav: "Event night",
    menuLabel: "Event night",
    title: "Event night",
    lead: "Tools for one event on one date: what an organiser says about access, what is still Unknown, and a list to prepare before you go.",
    onDevice: "Everything here stays on this device. Nothing is sent. Files are saved and shared by you.",
    notChecked: "An organiser’s answers are the organiser’s own statement. Nobody else has checked them, and the App does not show them as confirmed.",
    listHeading: "What you can do",
    organiserLink: "Organiser checklist",
    organiserAbout: "For event organisers. Answer what you know about access for one date and save a file to share.",
    openLink: "Open an organiser file",
    openAbout: "Read a file an organiser shared with you. Anything not answered stays Unknown.",
    journeyLink: "Getting to the door",
    journeyAbout: "See what a journey planner would be given for an event. No planner is connected, so no route is shown.",
    outingLink: "Plan an outing",
    outingAbout: "Keep a list of what to ask and what to bring. It starts from the items the event record leaves Unknown.",
    journeyPickerLabel: "Demonstration event",
    journeyPickerHelp: "These events are made up for testing. They describe no real place.",
    journeyNone: "No demonstration event is available.",
  },
  fr: {
    nav: "Soirée d’événement",
    menuLabel: "Soirée d’événement",
    title: "Soirée d’événement",
    lead: `Des outils pour un événement à une date donnée${N}: ce qu’un organisateur dit de l’accès, ce qui reste inconnu, et une liste à préparer avant de partir.`,
    onDevice: "Tout reste sur cet appareil. Rien n’est envoyé. Vous enregistrez et partagez vous-même les fichiers.",
    notChecked: "Les réponses d’un organisateur sont sa propre déclaration. Personne d’autre ne les a contrôlées, et l’application ne les présente pas comme confirmées.",
    listHeading: "Ce que vous pouvez faire",
    organiserLink: "Liste de l’organisateur",
    organiserAbout: "Pour les organisateurs d’événements. Indiquez ce que vous savez de l’accès pour une date et enregistrez un fichier à partager.",
    openLink: "Ouvrir un fichier d’organisateur",
    openAbout: "Lisez un fichier qu’un organisateur vous a transmis. Ce qui n’a pas de réponse reste inconnu.",
    journeyLink: "Se rendre à la porte",
    journeyAbout: "Voyez ce qui serait transmis à un planificateur de trajet pour un événement. Aucun planificateur n’est connecté, donc aucun trajet n’est affiché.",
    outingLink: "Planifier une sortie",
    outingAbout: "Gardez une liste de ce qu’il faut demander et apporter. Elle commence par les éléments que la fiche de l’événement laisse inconnus.",
    journeyPickerLabel: "Événement de démonstration",
    journeyPickerHelp: "Ces événements sont inventés pour des essais. Ils ne décrivent aucun lieu réel.",
    journeyNone: "Aucun événement de démonstration n’est disponible.",
  },
} as const;

export type EventNightLanguage = keyof typeof EVENT_NIGHT_STRINGS;
export type EventNightKey = keyof (typeof EVENT_NIGHT_STRINGS)["en"];

export function eventNightText(language: EventNightLanguage, key: EventNightKey): string {
  return EVENT_NIGHT_STRINGS[language][key];
}
