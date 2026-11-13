/**
 * French drafts of the does / does-not / data-uses lists and of the source notes.
 * Same count and order as the English lists. A Franco-Ontarian review is not recorded.
 * machineTranslated stays false: these sentences were written for this draft.
 */
export interface FrenchSourceNote {
  title: string;
  limit: string;
}

export interface FrenchBoundary {
  does: string[];
  doesNot: string[];
  dataUses: string[];
  sources: FrenchSourceNote[];
}

export const FR_BOUNDARIES: Record<string, FrenchBoundary> = {
  "what-the-app-is": {
    does: [
      "Expliquer que le produit s'appelle l'application.",
      "Séparer les faits sur un lieu, les conseils des pairs et l'information de santé.",
      "Dire, avec les mêmes mots, ce que l'application refuse de faire.",
    ],
    doesNot: [
      "Affirmer que Spinal Cord Injury Ontario, AccessNow, Google, une société de transport ou une municipalité approuve l'application.",
      "Donner un conseil médical, juridique ou sur l'admissibilité à une prestation.",
      "Dire qu'un lieu est accessible parce qu'une épingle de carte est verte.",
    ],
    dataUses: ["Aucune donnée personnelle. L'article est un texte inclus dans l'application."],
    sources: [
      {
        title: "Plan directeur, novembre 2026, règle du produit sans marque et limites cliniques",
        limit: "Le plan est une proposition. Ce n'est pas une déclaration de Spinal Cord Injury Ontario.",
      },
    ],
  },
  "get-help-now": {
    does: [
      "Garder l'aide d'urgence au même endroit sur chaque écran.",
      "Offrir le 911 d'abord, sans questions.",
      "Indiquer des lignes de santé et de crise vérifiées à une date nommée.",
    ],
    doesNot: [
      "Poser des questions avant de montrer le 911.",
      "Vérifier des symptômes, lire une tension artérielle ou dire s'il faut attendre.",
      "Enregistrer ce que vous alliez dire au sujet d'une urgence.",
    ],
    dataUses: ["Texte d'aide inclus et liste de repères vérifiée le 13 novembre 2026. Aucune divulgation de crise n'est enregistrée."],
    sources: [
      {
        title: "Page d'accueil de la ligne d'aide 9-8-8",
        limit: "Confirme l'appel ou le texto au 9-8-8, et dit d'appeler le 911 si la sécurité est en jeu. Ne décrit pas la lésion médullaire.",
      },
      {
        title: "Page de contact de Health811",
        limit: "Confirme le 811 et l'ATS 711 pour un conseil de santé non urgent. La page dit d'appeler le 911 en cas d'urgence médicale.",
      },
    ],
  },
  "crisis-support": {
    does: [
      "Montrer le 9-8-8 et ConnexOntario sans formulaire.",
      "Dire que l'application n'est pas un service de crise.",
      "Laisser la conversation sur la ligne téléphonique ou texto, pas dans l'application.",
    ],
    doesNot: [
      "Vous demander d'écrire des idées suicidaires dans l'application.",
      "Enregistrer une divulgation de crise.",
      "Offrir du counseling, un score de risque ou un plan de sécurité.",
    ],
    dataUses: ["Texte d'aide inclus et les contacts 9-8-8 et ConnexOntario. L'application n'enregistre pas ce que vous auriez pu écrire au sujet d'une crise."],
    sources: [
      {
        title: "Ligne d'aide 9-8-8",
        limit: "Description du service seulement. L'application n'exploite pas le 9-8-8.",
      },
      {
        title: "Page de contact de ConnexOntario",
        limit: "Indique le 1-866-531-2600 et le texto CONNEX au 247247. Des frais du fournisseur peuvent s'appliquer au texto.",
      },
    ],
  },
  "health-concerns": {
    does: [
      "Vous diriger vers Health811, votre clinicien ou votre clinicienne, et le 911.",
      "Garder le texte de santé général, daté, et marqué comme n'étant pas un conseil personnel.",
    ],
    doesNot: [
      "Diagnostiquer une infection urinaire, une lésion de pression, une douleur ou toute autre condition.",
      "Vous dire quand faire un cathétérisme, comment faire un transfert, ou quel coussin utiliser.",
      "Lancer des minuteries pour le soulagement de pression ou les soins de la vessie.",
    ],
    dataUses: ["Texte d'aide inclus et le contact Health811. Aucun journal de symptômes et aucun dossier de santé."],
    sources: [
      {
        title: "Page d'appel de Health811",
        limit: "Décrit les infirmières et infirmiers de Health811. Ce n'est pas un protocole clinique pour la lésion médullaire.",
      },
    ],
  },
  privacy: {
    does: [
      "Permettre l'aide sur les lieux et les trajets sans compte.",
      "Demander un consentement distinct, en langage clair, pour chaque usage supplémentaire de renseignements personnels.",
      "Rester honnête dans cette ébauche sur la loi de protection de la vie privée qui n'est pas tranchée.",
    ],
    doesNot: [
      "Décider si la LPRPS ou la LPRPDE s'applique. Cette décision demande un avocat.",
      "Exiger un diagnostic, un niveau de lésion ou une carte Santé.",
      "Vendre de l'information de localisation ou liée à la santé, ni afficher de publicité.",
    ],
    dataUses: ["Aucun compte n'est exigé pour lire cet article. L'article ne recueille pas de profil."],
    sources: [
      {
        title: "Plan directeur, partie 2, section 5, vie privée",
        limit: "Le plan dit que la question LPRPS ou LPRPDE n'est pas tranchée et que le texte des lois n'a pas été relu pour cette ébauche.",
      },
    ],
  },
  "indigenous-data": {
    does: [
      "Refuser les fiches sur une réserve ou sous gouvernance d'une Nation tant que cette Nation n'a pas accepté.",
      "Nommer les PCAP comme des principes des Premières Nations, pas comme une règle panautochtone.",
      "Garder les fonctions de base libres de toute vérification d'identité.",
    ],
    doesNot: [
      "Recueillir une identité autochtone, un statut ou une appartenance dans un profil.",
      "Traiter une reconnaissance territoriale comme une mobilisation.",
      "Dire que parler à l'équipe de l'application remplit un devoir de consultation de la Couronne.",
    ],
    dataUses: ["Aucune donnée d'identité. Aucune fiche de réserve ou de Nation n'est incluse."],
    sources: [
      {
        title: "Plan directeur, partie 2, section 7.2, principes de mobilisation autochtone",
        limit: "Le plan résume des sources secondaires. Il dit que fnigc.ca n'a pas été consulté lors de ce passage (inconnu U72).",
      },
    ],
  },
  "peer-tips": {
    does: [
      "Garder un conseil pratique sur cet appareil. Une revue par une personne est exigée avant une communauté publique. Personne n'est en poste dans ce prototype.",
      "Montrer le nom d'affichage choisi, la date, et une étiquette qui dit qu'aucune revue n'est dotée.",
      "Garder les conseils des familles dans l'espace des familles, sauf si l'auteur demande un partage plus large.",
    ],
    doesNot: [
      "Vous jumeler avec un mentor.",
      "Permettre aux personnes de s'envoyer des messages.",
      "Publier un avis de santé, une méthode de transfert, une recommandation d'équipement ou une décision de prestation.",
    ],
    dataUses: ["Un conseil d'exercice reste sur l'appareil jusqu'à ce que vous l'effaciez. Ce paquet ne sert pas de conseils publics depuis un serveur."],
    sources: [
      {
        title: "Plan directeur, partie 2 section 4 et partie 4, fonction F-16",
        limit: "La formation et les politiques de protection de SCIO Connect n'ont pas été vérifiées (inconnu U23). Aucune entente avec SCIO n'existe.",
      },
    ],
  },
  events: {
    does: [
      "Montrer une note d'accessibilité distincte pour cet événement, pas seulement pour le bâtiment.",
      "Envoyer l'inscription vers la page de l'organisateur.",
      "Étiqueter les fiches de démonstration comme des données de démonstration.",
    ],
    doesNot: [
      "Vous inscrire à un événement dans l'application.",
      "Traiter la note du lieu du mois dernier comme une preuve pour l'événement de ce soir.",
      "Affirmer qu'une fiche est un événement de Spinal Cord Injury Ontario, sauf si SCIO l'a publié et que la fiche le dit.",
    ],
    dataUses: ["Trois fiches d'événements de démonstration saisies à la main. Aucune liste de présence et aucune donnée d'inscription."],
    sources: [
      {
        title: "Plan directeur, partie 4, fonction F-13, et partie 5, jour 16",
        limit: "Le jour 16 demande des événements de démonstration, pas un calendrier en service. Le calendrier actuel de SCIO n'a pas été relu.",
      },
    ],
  },
  reporting: {
    does: [
      "Recevoir un signalement dans l'application, et publier un chemin par téléphone et courriel quand l'application n'est pas le bon canal.",
      "Cacher un conseil signalé jusqu'à ce qu'une personne le lise.",
      "Garder l'identité de la personne qui signale hors du conseil public.",
    ],
    doesNot: [
      "Trancher un signalement de protection par le logiciel seul.",
      "Montrer le signalement à la personne visée.",
      "Effacer un signalement sans trace.",
    ],
    dataUses: ["Un signalement d'exercice reste sur l'appareil. Le jeton de la personne qui signale n'est pas copié sur le conseil public."],
    sources: [
      {
        title: "Plan directeur, partie 2, sections 4.3 et 4.4",
        limit: "Les délais du plan sont marqués comme proposés, pas comme un service doté. Aucune personne responsable de la protection n'est nommée dans ce prototype.",
      },
    ],
  },
  languages: {
    does: [
      "Offrir l'anglais et le français au premier écran, dans l'en-tête et dans l'aide.",
      "Garder votre place quand vous changez de langue.",
      "Étiqueter tout texte qui n'existe que dans une langue.",
    ],
    doesNot: [
      "Cacher le français derrière une demande.",
      "Traduire automatiquement un texte de sécurité, de santé, de droit ou de prestations.",
      "Affirmer que la Loi sur les services en français oblige ce prototype privé à être bilingue. À elle seule, elle ne l'oblige pas.",
    ],
    dataUses: ["Le choix de langue est enregistré sur l'appareil sous une clé locale. Il n'est pas envoyé à un serveur."],
    sources: [
      {
        title: "Plan directeur, partie 2 section 7.1 et partie 4, fonction F-22",
        limit: "Le nombre de régions désignées est un conflit non résolu dans le plan (25 contre 27). Cet article ne choisit pas un nombre.",
      },
    ],
  },
  labels: {
    does: [
      "Montrer une étiquette de vérification, une source et une date sur les fiches que l'application affiche.",
      "Écrire Inconnu quand un champ n'a pas été vérifié.",
      "Garder les conseils des pairs visuellement séparés des mesures.",
    ],
    doesNot: [
      "Utiliser le mot vérifié pour une fiche de prototype.",
      "Transformer une étiquette de données ouvertes en mesure.",
      "Deviner une largeur de porte, un côté de transfert ou l'état d'un ascenseur.",
    ],
    dataUses: ["L'article explique les étiquettes. Il ne charge pas de fiches de lieux."],
    sources: [
      {
        title: "Plan directeur, partie 5, jour 1, et le schéma partagé des niveaux de vérification",
        limit: "Les niveaux canoniques sont 0, 1, 2, 3, 4 et E. Les étiquettes de prototype sont PROTOTYPE-UNVERIFIED, SEEDED-OPEN-DATA, COMMUNITY-REPORTED et VERIFIED. VERIFIED et le niveau 3 ne sont pas produits par ce prototype.",
      },
    ],
  },
  offline: {
    does: [
      "Garder ces articles d'aide sur l'appareil après le premier enregistrement.",
      "Montrer la date d'enregistrement du paquet.",
      "Laisser le 911 et les numéros de crise dans le paquet d'aide enregistré.",
    ],
    doesNot: [
      "Prétendre qu'un état d'ascenseur enregistré est en direct.",
      "Télécharger les renseignements personnels d'une autre personne dans le paquet.",
      "Exiger une connexion pour lire un article enregistré.",
    ],
    dataUses: ["Le paquet d'aide enregistré dans IndexedDB ou en mémoire sur l'appareil, avec l'heure d'enregistrement. Aucun historique de localisation."],
    sources: [
      {
        title: "Plan directeur, partie 4, fonction F-15, et règle d'aide constante de la partie 2",
        limit: "Les paquets de trajets pour les cartes et les lieux sont construits dans d'autres dépôts. Ce paquet enregistre les articles d'aide seulement.",
      },
    ],
  },
  programmes: {
    does: [
      "Renvoyer vers les pages officielles des programmes.",
      "Dire qui publie une page et quand l'application l'a consultée.",
      "Dire que l'application ne peut pas dire si un programme vous accepte.",
    ],
    doesNot: [
      "Calculer une prestation, une quote-part ou une subvention.",
      "Recommander un fauteuil roulant, un coussin ou un fournisseur.",
      "Lister les services de préposés comme un programme actuel de Spinal Cord Injury Ontario. Ce statut n'est pas vérifié.",
    ],
    dataUses: ["Descriptions incluses et un lien vers des sites publics. Aucune donnée d'admissibilité et aucun montant de prestation."],
    sources: [
      {
        title: "Plan directeur, partie 2, sections 3.4 à 3.6, et partie 4, fonction F-10",
        limit: "Les montants en dollars du plan étaient marqués pour une revérification. Cet article omet les montants en dollars.",
      },
      {
        title: "211 Ontario",
        limit: "Lien seulement. Pas un jeu de données ouvertes.",
      },
    ],
  },
  complaints: {
    does: [
      "Décrire un chemin de plainte pour une donnée erronée, de la discrimination, la vie privée, l'accessibilité de l'application et la protection.",
      "Dire qu'une plainte n'est pas publiée comme un fait sur un lieu.",
      "Offrir ce texte d'aide en anglais et en français.",
    ],
    doesNot: [
      "Donner un avis juridique.",
      "Étiqueter un lieu comme conforme au Code des droits de la personne ou à la LAPHO.",
      "Promettre un délai de réponse que personne n'est en poste pour respecter.",
    ],
    dataUses: ["Texte de politique inclus. Aucune boîte de plaintes n'est dotée dans ce paquet."],
    sources: [
      {
        title: "Plan directeur, partie 2, sections 4.6 et 6",
        limit: "Le plan propose un accusé de réception en un jour ouvrable. Ce n'est pas un service doté. La norme d'accessibilité intégrée n'est pas appliquée ici.",
      },
    ],
  },
  "journey-planner": {
    does: [
      "Décrire un trajet comme des étapes séparées, y compris l'approche de l'arrêt jusqu'à la porte.",
      "Étiqueter les heures comme prévues, sauf si une source en direct et une heure sont à l'écran.",
      "Écrire Inconnu quand l'approche n'a pas été vérifiée.",
    ],
    doesNot: [
      "Supposer qu'un trajet est sans marche parce qu'une station et un lieu disent tous les deux accessibles.",
      "Appeler une heure prévue une heure en direct.",
      "Planifier un trajet dans ce paquet d'aide. Le planificateur n'est pas dans ce dépôt.",
    ],
    dataUses: ["Aucune donnée de trajet dans ce paquet. Un futur planificateur utiliserait des fiches de lieux, de trajets et d'horaires avec des sources et des dates."],
    sources: [
      {
        title: "Plan directeur, partie 5, jours 4 et 5",
        limit: "Ce dépôt ne contient pas le moteur d'itinéraire ni les lieux ensemencés.",
      },
    ],
  },
  finders: {
    does: [
      "Expliquer qu'un résultat de recherche a besoin d'un niveau, d'une source et d'une date.",
      "Dire quand un filtre a retiré des résultats, et pourquoi.",
      "Vous dire d'élargir un filtre quand rien ne correspond.",
    ],
    doesNot: [
      "Montrer si une toilette est ouverte, propre ou gratuite en ce moment.",
      "Montrer si une place de stationnement est libre en ce moment.",
      "Inventer une toilette ou une place de stationnement. Ce paquet n'a pas de base de recherche.",
    ],
    dataUses: ["Aucune fiche de toilette ou de stationnement dans ce paquet. Un futur outil utiliserait des fiches sourcées avec des niveaux et des dates."],
    sources: [
      {
        title: "Plan directeur, partie 5, jours 7 et 8",
        limit: "Les données de recherche vivent dans d'autres dépôts. Aucune n'est chargée ici.",
      },
    ],
  },
  profile: {
    does: [
      "Permettre des préférences fonctionnelles facultatives, comme le type de fauteuil ou le côté de transfert, quand un profil existe.",
      "Garder ces préférences sur l'appareil.",
      "Permettre de les effacer.",
    ],
    doesNot: [
      "Demander un niveau de lésion, un diagnostic, un médicament ou un historique de santé.",
      "Exiger un profil pour lire l'aide ou pour voir un fait public sur un lieu.",
      "Enregistrer un profil dans ce paquet d'aide. Il n'y a pas de base de profils ici.",
    ],
    dataUses: ["Aucun profil n'est enregistré ici. Un futur profil serait des champs fonctionnels facultatifs sur l'appareil, pas un dossier de santé."],
    sources: [
      {
        title: "Plan directeur, partie 2 section 5.4 et partie 5, jour 6",
        limit: "L'enregistrement du profil est spécifié pour l'appareil. Il n'est pas mis en œuvre dans ce paquet.",
      },
    ],
  },
  "games-hub": {
    does: [
      "Nommer les dix activités de départ que le plan permet.",
      "Dire que les scores, si un jeu existe, restent sur l'appareil.",
      "Dire que les jeux ne sont pas dans ce dépôt.",
    ],
    doesNot: [
      "Affirmer qu'un jeu est une thérapie, un traitement ou une évaluation médicale.",
      "Utiliser les noms de jeux d'une autre entreprise.",
      "Montrer un score à quelqu'un d'autre.",
    ],
    dataUses: ["Aucun score et aucun état de jeu dans ce paquet. Un futur jeu garderait les scores sur l'appareil seulement."],
    sources: [
      {
        title: "Plan directeur, partie 5, les dix jeux de départ",
        limit: "Les jeux sont assignés à un autre dépôt. Cet article ne fait que les nommer et énoncer les limites.",
      },
    ],
  },
  "community-skeleton": {
    does: [
      "Renvoyer vers les pages de programmes de Spinal Cord Injury Ontario.",
      "Montrer trois événements de démonstration avec des étiquettes de démonstration.",
      "Expliquer la dotation qu'une communauté en service exigerait, et dire que ce n'est pas en fonction.",
    ],
    doesNot: [
      "Remplacer les services de SCIO ou affirmer que SCIO a approuvé l'application.",
      "Prendre les inscriptions aux événements dans l'application.",
      "Offrir des messages ou un jumelage de mentors sur les écrans du prototype.",
    ],
    dataUses: ["Texte des programmes, trois événements de démonstration et l'explication de la modération. Aucune publication en direct sur les écrans du squelette."],
    sources: [
      {
        title: "Plan directeur, partie 5, jour 16",
        limit: "L'exercice de revue gouverné est un écran séparé. Ce n'est pas une communauté en service.",
      },
    ],
  },
};
