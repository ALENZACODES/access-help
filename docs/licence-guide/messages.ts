/** Words for the licence mix and its duties. Every string exists in English and French. */
import type { Duty, LicenceCount, Mix, MixKind } from './mix.js';
import { colon, fill, pick, type PreLang } from '../presubmit/text.js';

export function mixLabel(kind: MixKind, lang: PreLang): string {
  switch (kind) {
    case 'empty':
      return pick(lang, 'No records to look at', 'Aucune fiche à examiner');
    case 'cc0-only':
      return pick(lang, 'Every record is CC0-1.0', 'Toutes les fiches sont en CC0-1.0');
    case 'odbl-only':
      return pick(lang, 'Every record is ODbL-1.0', 'Toutes les fiches sont en ODbL-1.0');
    case 'cc0-and-odbl':
      return pick(lang, 'CC0-1.0 and ODbL-1.0 together', 'CC0-1.0 et ODbL-1.0 ensemble');
    case 'has-other':
      return pick(lang, 'Some records have a licence the App does not accept', 'Certaines fiches ont une licence que l’application n’accepte pas');
  }
}

export function mixExplanation(kind: MixKind, lang: PreLang): string {
  switch (kind) {
    case 'empty':
      return pick(lang, 'There is nothing to share, so nothing is asked.', 'Il n’y a rien à partager, donc rien n’est demandé.');
    case 'cc0-only':
      return pick(lang, 'Sharing these together asks for nothing. Naming the sources is still a kindness to the next reader.', 'Les partager ensemble ne demande rien. Nommer les sources reste une attention pour la personne qui lira ensuite.');
    case 'odbl-only':
      return pick(lang, 'Sharing these together asks for credit, the same licence on a changed database, and an open copy.', 'Les partager ensemble demande une mention, la même licence pour une base modifiée, et une copie ouverte.');
    case 'cc0-and-odbl':
      return pick(
        lang,
        'A file that holds both is treated like the ODbL-1.0 part: credit, the same licence on a changed database, and an open copy. The CC0-1.0 records on their own still ask for nothing.',
        'Un fichier qui contient les deux est traité comme la partie ODbL-1.0\u00a0: mention, même licence pour une base modifiée, et copie ouverte. Les fiches CC0-1.0 prises seules ne demandent toujours rien.',
      );
    case 'has-other':
      return pick(
        lang,
        'The App accepts only CC0-1.0 and ODbL-1.0, so it cannot say what sharing the whole set asks. Leave those records out, or find out their terms first.',
        'L’application n’accepte que CC0-1.0 et ODbL-1.0, donc elle ne peut pas dire ce que demande le partage de l’ensemble. Laissez ces fiches de côté, ou renseignez-vous d’abord sur leurs conditions.',
      );
  }
}

export function dutyText(duty: Duty, lang: PreLang): string {
  switch (duty) {
    case 'credit-sources':
      return pick(lang, 'Credit the ODbL-1.0 sources where people will see it.', 'Citez les sources ODbL-1.0 là où les gens le verront.');
    case 'same-licence':
      return pick(lang, 'If you share a changed database in public, share it under ODbL-1.0.', 'Si vous partagez publiquement une base modifiée, partagez-la sous ODbL-1.0.');
    case 'keep-open':
      return pick(lang, 'If you share a locked copy, also offer one without the lock.', 'Si vous partagez une copie verrouillée, offrez-en aussi une sans verrou.');
    case 'do-not-share-yet':
      return pick(lang, 'Do not share the whole set until the other licences are sorted out.', 'Ne partagez pas l’ensemble avant d’avoir éclairci les autres licences.');
  }
}

export function countText(count: LicenceCount, lang: PreLang): string {
  const tail = count.accepted ? '' : pick(lang, ' (the App does not take this licence)', ' (l’application ne prend pas cette licence)');
  return `${count.licence}${colon(lang)}${count.count}${tail}`;
}

export function mixSummaryText(mix: Mix, lang: PreLang): string {
  if (mix.kind === 'empty') return mixLabel('empty', lang);
  const head = `${pick(lang, 'Records', 'Fiches')}${colon(lang)}${mix.total}.`;
  const counts = mix.counts.map((count) => `${countText(count, lang)}.`).join(' ');
  const combined =
    mix.combinedLicence === null
      ? pick(lang, 'Licence for a combined file: cannot be said.', 'Licence d’un fichier combiné\u00a0: impossible à dire.')
      : fill(pick(lang, 'Licence for a combined file: {licence}.', 'Licence d’un fichier combiné\u00a0: {licence}.'), { licence: mix.combinedLicence });
  return `${head} ${counts} ${combined}`;
}

export function osmNoteText(lang: PreLang): string {
  return pick(
    lang,
    'An open licence on a pack does not by itself mean OpenStreetMap takes a copy of it. Add to the map what you saw yourself.',
    'Une licence ouverte sur un paquet ne veut pas dire à elle seule qu’OpenStreetMap en prend une copie. Ajoutez à la carte ce que vous avez vu vous-même.',
  );
}
