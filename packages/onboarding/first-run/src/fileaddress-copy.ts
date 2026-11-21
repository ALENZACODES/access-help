import type { Locale } from "../../switch-first/src/index";
import { NB, NN, t, type Pair } from "./copy";
import { ISSUE_KINDS, countIssues, type AddressIssue, type AddressReport, type FixedCopy, type IssueKind, type StreetSpellings } from "./addresscheck";
import type { ImportError } from "./exchange";

/**
 * Words for "Check the addresses in a file", in English and French. French
 * copy uses ’, U+00A0 before ":" and U+202F before ; ! ? and inside « ».
 */
export const FILE_ADDRESS_COPY = {
  title: { en: "Check the addresses in a file", fr: "Examiner les adresses d’un fichier" },
  intro: {
    en: "See what in the addresses of a notes export may keep places from being sorted by street, matched to a list or found by postal area, and fix it in a copy if you choose.",
    fr: "Voyez ce qui, dans les adresses d’une exportation de notes, peut empêcher de trier les lieux par rue, de les rapprocher d’une liste ou de les trouver par zone postale, et corrigez-le dans une copie si vous le souhaitez.",
  },
  privacy: {
    en: "Addresses are only read as typed. Nothing is looked up, nothing is saved and nothing is sent anywhere. Your file does not change.",
    fr: "Les adresses sont seulement lues telles qu’elles sont saisies. Rien n’est recherché, enregistré ni envoyé. Votre fichier ne change pas.",
  },
  pasteLabel: { en: "Text of the notes file", fr: "Texte du fichier de notes" },
  pasteHint: {
    en: "A notes export is made with “Export notes” on the Notes page.",
    fr: `Une exportation de notes se crée avec «${NN}Exporter les notes${NN}» sur la page Notes.`,
  },
  openLabel: { en: "Or open the file from this device", fr: "Ou ouvrez le fichier depuis cet appareil" },
  read: { en: "Look at the addresses", fr: "Examiner les adresses" },
  clear: { en: "Remove the file and the results", fr: "Retirer le fichier et les résultats" },
  cleared: { en: "The page is empty. Nothing was saved.", fr: "La page est vide. Rien n’a été enregistré." },
  opened: { en: "The file is in the box. Choose Look at the addresses when ready.", fr: "Le fichier est dans la zone. Choisissez Examiner les adresses quand vous êtes prêt." },
  readFailed: { en: "That file could not be opened. Try pasting its text instead.", fr: "Ce fichier n’a pas pu être ouvert. Essayez plutôt de coller son texte." },
  errorsTitle: { en: "Fix this first", fr: "À corriger d’abord" },
  kinds: {
    "no-address": {
      title: { en: "Places with no address", fr: "Lieux sans adresse" },
      hint: {
        en: "These places cannot be sorted by street or found by postal area, and a list can only match them by name.",
        fr: "Ces lieux ne peuvent être ni triés par rue ni trouvés par zone postale, et une liste ne peut les rapprocher que par leur nom.",
      },
    },
    intersection: {
      title: { en: "Addresses at a crossing of streets", fr: "Adresses à un croisement de rues" },
      hint: {
        en: "These name a corner, such as King St & Bay St. That is a real place, but not one a single street can hold, so it is not put on a street. Nothing needs fixing unless the place has a house number.",
        fr: "Ces adresses nomment un coin, comme rue Principale et rue Laurier. C’est un vrai lieu, mais aucune rue seule ne peut le contenir, il n’est donc rattaché à aucune rue. Rien n’est à corriger, sauf si le lieu a un numéro.",
      },
    },
    "no-street": {
      title: { en: "Addresses with no house number and street", fr: "Adresses sans numéro ni rue" },
      hint: {
        en: "The App reads a street from a house number followed by the street, such as 12 King St W. These addresses are kept as they are, but are not put on a street.",
        fr: "L’App lit une rue à partir d’un numéro suivi de la rue, comme 12 rue Principale. Ces adresses restent telles quelles, mais ne sont rattachées à aucune rue.",
      },
    },
    "postal-mistyped": {
      title: { en: "Postal codes that may be mistyped", fr: "Codes postaux peut-être mal tapés" },
      hint: {
        en: "As written, these cannot be Canadian postal codes, but with a letter O read as zero or a letter I as one, they can. Check each against the place before you fix it.",
        fr: "Tels qu’écrits, ce ne peuvent pas être des codes postaux canadiens, mais en lisant la lettre O comme un zéro ou la lettre I comme un un, ils le peuvent. Comparez chacun au lieu avant de le corriger.",
      },
    },
    "postal-invalid": {
      title: { en: "Text that cannot be a postal code", fr: "Textes qui ne peuvent pas être un code postal" },
      hint: {
        en: "This text is shaped like a Canadian postal code but uses letters Canada Post does not. The App does not guess what was meant.",
        fr: "Ce texte a la forme d’un code postal canadien, mais utilise des lettres que Postes Canada n’emploie pas. L’App ne devine pas ce qui était voulu.",
      },
    },
    "postal-other-area": {
      title: { en: "Postal areas unlike the rest of their street", fr: "Zones postales différentes du reste de leur rue" },
      hint: {
        en: "Most places on these streets share one postal area, but these do not. A street can cross areas, so this may be right; it may also be a typo. The App does not guess a code.",
        fr: "La plupart des lieux de ces rues partagent une zone postale, mais pas ceux-ci. Une rue peut traverser plusieurs zones, donc c’est peut-être exact, ou peut-être une faute de frappe. L’App ne devine pas de code.",
      },
    },
    "postal-format": {
      title: { en: "Postal codes written another way", fr: "Codes postaux écrits autrement" },
      hint: {
        en: "These are valid codes written in lowercase, without the space or with a hyphen. Writing them the usual way helps a list or a search match them.",
        fr: "Ce sont des codes valides écrits en minuscules, sans espace ou avec un trait d’union. Les écrire de la façon habituelle aide une liste ou une recherche à les rapprocher.",
      },
    },
  },
  streetsTitle: { en: "Streets written more than one way", fr: "Rues écrites de plusieurs façons" },
  streetsHint: {
    en: "These are read as the same street, but written differently. A list or a search for one way of writing may miss the others. You can write each street one way in the copy.",
    fr: "Ces rues sont lues comme une même rue, mais écrites différemment. Une liste ou une recherche d’une seule graphie peut manquer les autres. Vous pouvez écrire chaque rue d’une seule façon dans la copie.",
  },
  writeStreetAs: { en: "Write this street as", fr: "Écrire cette rue" },
  namesTitle: { en: "One address, several names", fr: "Une adresse, plusieurs noms" },
  namesHint: {
    en: "These places have the same house number and street but different names. They may be one place written two ways, or several places in one building. Only you can tell. If they are one place, choose the name to keep: in the copy, their notes are joined as one place.",
    fr: `Ces lieux ont le même numéro et la même rue, mais des noms différents. C’est peut-être un seul lieu écrit de deux façons, ou plusieurs lieux dans un même bâtiment. Vous seul pouvez le dire. S’il s’agit d’un seul lieu, choisissez le nom à garder${NB}: dans la copie, leurs notes sont réunies en un seul lieu.`,
  },
  namesLegend: { en: "Which name to keep at", fr: "Nom à garder au" },
  keepAll: { en: "They are different places: keep every name", fr: `Ce sont des lieux différents${NB}: garder tous les noms` },
  keepName: { en: "One place, named", fr: "Un seul lieu, nommé" },
  leaveStreet: { en: "Leave as it is", fr: "Laisser tel quel" },
  fixPostal: { en: "Use", fr: "Utiliser" },
  noIssues: { en: "Nothing in these addresses keeps the App from reading them.", fr: "Rien dans ces adresses n’empêche l’App de les lire." },
  copyTitle: { en: "A copy with your fixes", fr: "Une copie avec vos corrections" },
  copyHint: {
    en: "Only the addresses you choose change in the copy; every note keeps its name, details, records, licence and date. Places with the same name and address are shown as one place.",
    fr: `Seules les adresses choisies changent dans la copie${NN}; chaque note garde son nom, ses détails, ses données, sa licence et sa date. Les lieux qui ont le même nom et la même adresse sont présentés comme un seul lieu.`,
  },
  makeCopy: { en: "Make the copy", fr: "Faire la copie" },
  noneChosen: { en: "Choose at least one fix for the copy.", fr: "Choisissez au moins une correction pour la copie." },
  downloadCopy: { en: "Download the copy", fr: "Télécharger la copie" },
  downloadCsv: { en: "Download the results as a spreadsheet (CSV)", fr: "Télécharger les résultats en tableur (CSV)" },
  noAddress: { en: "No address", fr: "Aucune adresse" },
  made: { en: "The copy is ready.", fr: "La copie est prête." },
  tickAll: { en: "Tick every suggested postal code", fr: "Cocher chaque code postal proposé" },
  ticked: {
    en: "Every suggested code is ticked. Look at each one before you make the copy.",
    fr: "Chaque code proposé est coché. Regardez-les un par un avant de faire la copie.",
  },
  downloadText: { en: "Download the results to print", fr: "Télécharger les résultats à imprimer" },
  printMade: { en: "Made on", fr: "Créé le" },
  errors: {
    empty: { en: "The box is empty. Paste the file’s text or open it.", fr: "La zone est vide. Collez le texte du fichier ou ouvrez-le." },
    "too-large": { en: "The file is too large to read here.", fr: "Le fichier est trop volumineux pour être lu ici." },
    "not-json": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-format": { en: "This text is not a notes export.", fr: "Ce texte n’est pas une exportation de notes." },
    "wrong-version": { en: "This export comes from a different version and cannot be read.", fr: "Cette exportation provient d’une autre version et ne peut pas être lue." },
    "no-notes": { en: "This file has no note the App can read.", fr: "Ce fichier ne contient aucune note lisible par l’App." },
  },
} as const;

export function addressErrorText(e: ImportError | "no-notes", l: Locale): string {
  return t(FILE_ADDRESS_COPY.errors[e], l);
}

export function kindTitle(k: IssueKind, l: Locale): string {
  return t(FILE_ADDRESS_COPY.kinds[k].title, l);
}

export function kindHint(k: IssueKind, l: Locale): string {
  return t(FILE_ADDRESS_COPY.kinds[k].hint, l);
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
const countFr = (n: number, one: string, many: string): string => `${n} ${n > 1 ? many : one}`;

/** "14 places: 2 with no address, 1 with no street, 1 postal code that may be mistyped…; 2 streets written more than one way." */
export function reportSummary(r: AddressReport, l: Locale): string {
  const c = countIssues(r);
  const total = r.issues.length + r.streets.length + r.names.length;
  if (total === 0) return l === "fr" ? `${countFr(r.places, "lieu", "lieux")}. ${t(FILE_ADDRESS_COPY.noIssues, l)}` : `${count(r.places, "place", "places")}. ${t(FILE_ADDRESS_COPY.noIssues, l)}`;
  if (l === "fr") {
    const parts = [
      `${c["no-address"]} sans adresse`,
      `${c.intersection} à un croisement`,
      `${c["no-street"]} sans numéro ni rue`,
      c["postal-mistyped"] > 1 ? `${c["postal-mistyped"]} codes postaux peut-être mal tapés` : `${c["postal-mistyped"]} code postal peut-être mal tapé`,
      `${c["postal-invalid"]} ${c["postal-invalid"] > 1 ? "textes qui ne peuvent" : "texte qui ne peut"} pas être un code postal`,
      `${c["postal-other-area"]} ${c["postal-other-area"] > 1 ? "zones postales différentes" : "zone postale différente"} du reste de la rue`,
      c["postal-format"] > 1 ? `${c["postal-format"]} codes postaux écrits autrement` : `${c["postal-format"]} code postal écrit autrement`,
    ];
    return `${countFr(r.places, "lieu", "lieux")}${NB}: ${parts.join(", ")}${NN}; ${countFr(r.streets.length, "rue écrite", "rues écrites")} de plusieurs façons${NN}; ${countFr(r.names.length, "adresse", "adresses")} avec plusieurs noms.`;
  }
  const parts = [
    `${c["no-address"]} with no address`,
    `${c.intersection} at a crossing of streets`,
    `${c["no-street"]} with no house number and street`,
    `${count(c["postal-mistyped"], "postal code", "postal codes")} that may be mistyped`,
    `${count(c["postal-invalid"], "text", "texts")} that cannot be a postal code`,
    `${count(c["postal-other-area"], "postal area", "postal areas")} unlike the rest of the street`,
    `${count(c["postal-format"], "postal code", "postal codes")} written another way`,
  ];
  return `${count(r.places, "place", "places")}: ${parts.join(", ")}; ${count(r.streets.length, "street", "streets")} written more than one way; ${count(r.names.length, "address", "addresses")} with several names.`;
}

/** "M5H 2NO → M5H 2N0". */
export function suggestionText(i: AddressIssue): string {
  return i.found !== undefined && i.suggestion !== undefined ? `${i.found} → ${i.suggestion}` : (i.found ?? "");
}

/** "King St W (3 places), King Street West (1 place)". */
export function formsText(s: StreetSpellings, l: Locale): string {
  return s.forms.map((f) => `${f.text} (${l === "fr" ? countFr(f.places, "lieu", "lieux") : count(f.places, "place", "places")})`).join(", ");
}

/** "The copy changes the address of 4 places (5 notes). 1 place now has the same name and address as another and is shown as one with it." */
export function copySummary(c: FixedCopy, l: Locale): string {
  if (l === "fr") {
    const head = `La copie change l’adresse de ${countFr(c.changedPlaces, "lieu", "lieux")} (${countFr(c.changedNotes, "note", "notes")}).`;
    if (c.joined === 0) return head;
    return `${head} ${countFr(c.joined, "lieu a", "lieux ont")} maintenant le même nom et la même adresse qu’un autre lieu et ${c.joined > 1 ? "sont présentés" : "est présenté"} avec lui comme un seul.`;
  }
  const head = `The copy changes the address of ${count(c.changedPlaces, "place", "places")} (${count(c.changedNotes, "note", "notes")}).`;
  if (c.joined === 0) return head;
  return `${head} ${count(c.joined, "place now has", "places now have")} the same name and address as another and ${c.joined === 1 ? "is" : "are"} shown as one with it.`;
}

/** The results as text to print: each kind of issue with its places, then the streets and the addresses with several names. */
export function addressText(r: AddressReport, l: Locale, today: Date): string {
  const k = l === "fr" ? `${NB}:` : ":";
  const lines: string[] = [t(FILE_ADDRESS_COPY.title, l), `${t(FILE_ADDRESS_COPY.printMade, l)} ${today.toISOString().slice(0, 10)}`, reportSummary(r, l), ""];
  for (const kind of ISSUE_KINDS) {
    const mine = r.issues.filter((i) => i.kind === kind);
    if (mine.length === 0) continue;
    lines.push(`${kindTitle(kind, l)} (${mine.length})`);
    for (const i of mine) lines.push(`  ${i.place.name}, ${i.place.address ?? t(FILE_ADDRESS_COPY.noAddress, l)}${i.found !== undefined ? ` [${suggestionText(i)}]` : ""}`);
    lines.push("");
  }
  if (r.streets.length > 0) {
    lines.push(`${t(FILE_ADDRESS_COPY.streetsTitle, l)} (${r.streets.length})`);
    for (const s of r.streets) lines.push(`  ${formsText(s, l)}`);
    lines.push("");
  }
  if (r.names.length > 0) {
    lines.push(`${t(FILE_ADDRESS_COPY.namesTitle, l)} (${r.names.length})`);
    for (const g of r.names) lines.push(`  ${g.places[0]?.address ?? ""}${k} ${g.places.map((p) => p.name).join(" / ")}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function addressFilename(kind: "copy" | "csv" | "text", today: Date, l: Locale): string {
  const day = today.toISOString().slice(0, 10);
  if (kind === "text") return l === "fr" ? `adresses-${day}.txt` : `addresses-${day}.txt`;
  if (kind === "csv") return l === "fr" ? `adresses-${day}.csv` : `addresses-${day}.csv`;
  return l === "fr" ? `notes-adresses-corrigees-${day}.json` : `notes-addresses-fixed-${day}.json`;
}

/** Every EN/FR pair in this feature, for the copy audit. */
export function fileAddressStrings(): Array<[string, Pair]> {
  const out: Array<[string, Pair]> = [];
  const walk = (path: string, v: unknown): void => {
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o["en"] === "string" && typeof o["fr"] === "string") {
      out.push([path, { en: o["en"], fr: o["fr"] }]);
      return;
    }
    for (const [k, c] of Object.entries(o)) walk(`${path}.${k}`, c);
  };
  walk("fileAddress", FILE_ADDRESS_COPY);
  return out;
}
