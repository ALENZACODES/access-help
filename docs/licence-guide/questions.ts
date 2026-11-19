/** Short questions and answers about licences, in plain language. English and French. */
import { pick, type PreLang } from '../presubmit/text.js';

export interface Question {
  id: string;
  question: string;
  answer: string;
}

export const QUESTION_IDS = ['which-for-mine', 'why-source', 'mix', 'change-later', 'unknown-licence', 'photo'] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export function licenceQuestions(lang: PreLang): Question[] {
  return [
    {
      id: 'which-for-mine',
      question: pick(lang, 'Which licence do I pick for my own observation?', 'Quelle licence choisir pour ma propre observation\u202f?'),
      answer: pick(
        lang,
        'Either one. CC0-1.0 asks nothing of the people who use it. ODbL-1.0 asks them for credit and to keep changed versions open. The App does not pick for you.',
        'L’une ou l’autre. CC0-1.0 ne demande rien aux personnes qui s’en servent. ODbL-1.0 leur demande une mention et de garder ouvertes les versions modifiées. L’application ne choisit pas pour vous.',
      ),
    },
    {
      id: 'why-source',
      question: pick(lang, 'Why does every record need a source?', 'Pourquoi chaque fiche a-t-elle besoin d’une source\u202f?'),
      answer: pick(
        lang,
        'So the next person can tell where it came from and how far to rely on it. A record with no source is not saved.',
        'Pour que la personne suivante sache d’où elle vient et jusqu’où s’y fier. Une fiche sans source n’est pas enregistrée.',
      ),
    },
    {
      id: 'mix',
      question: pick(lang, 'Can I put CC0-1.0 and ODbL-1.0 records in one file?', 'Puis-je mettre des fiches CC0-1.0 et ODbL-1.0 dans un même fichier\u202f?'),
      answer: pick(
        lang,
        'Yes. Each record keeps its own licence, and a file that holds both is shared the way ODbL-1.0 asks.',
        'Oui. Chaque fiche garde sa propre licence, et un fichier qui contient les deux se partage comme le demande ODbL-1.0.',
      ),
    },
    {
      id: 'change-later',
      question: pick(lang, 'Can I change the licence on my observation later?', 'Puis-je changer plus tard la licence de mon observation\u202f?'),
      answer: pick(
        lang,
        'You can change it on this device before you share it. Copies you already shared keep the licence they went out with.',
        'Vous pouvez la changer sur cet appareil avant de la partager. Les copies déjà partagées gardent la licence avec laquelle elles sont parties.',
      ),
    },
    {
      id: 'unknown-licence',
      question: pick(lang, 'What if a file has a licence the App does not know?', 'Et si un fichier porte une licence que l’application ne connaît pas\u202f?'),
      answer: pick(
        lang,
        'The App accepts only CC0-1.0 and ODbL-1.0. Records under anything else are not brought in, and the App says which ones.',
        'L’application n’accepte que CC0-1.0 et ODbL-1.0. Les fiches sous une autre licence ne sont pas importées, et l’application dit lesquelles.',
      ),
    },
    {
      id: 'photo',
      question: pick(lang, 'Do these licences cover photos?', 'Ces licences couvrent-elles les photos\u202f?'),
      answer: pick(
        lang,
        'The App stores no photos. These licences are about the records: a place, a status, a source and a date.',
        'L’application ne conserve aucune photo. Ces licences concernent les fiches\u00a0: un lieu, un état, une source et une date.',
      ),
    },
  ];
}
