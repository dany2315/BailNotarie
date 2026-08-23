export type BlogData = {
    id: string;
    title: string;
    slug: string;   
    description: string;
    content: string; // Gardé pour compatibilité (HTML ou vide si composant)
    readTime?: number; // Temps de lecture en minutes (optionnel, calculé si non fourni)
    imageUrl: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
    createdAt: Date;
    /**
     * Date de derniere revision reelle du contenu.
     * Sert de dateModified dans le balisage Article et de mention
     * "Mis a jour le" sur la page. A actualiser a chaque revision de fond
     * uniquement : une date factice est un mauvais signal de fraicheur.
     */
    updatedAt: Date;
    categoryId: string;    
}

export type BlogCategory = {
    id: string;
    name: string;
    slug: string;
}

export function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '')
  }

export const blogCategories = [
    {
        id: "1",
        name: "Bail Notarié",
        slug: "bail-notarie",
    },
]



export const blogData = [
    {
        id: "blog-1",
        title:"Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
        slug: generateSlug("Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?"),
        description: "Découvrez les avantages du bail notarié et pourquoi il peut être un choix judicieux pour sécuriser votre location immobilière.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 5, // Temps de lecture estimé en minutes
        metaTitle: "Bail notarié : définition, valeur juridique et intérêt réel",
        metaDescription: "Qu'est-ce qu'un bail notarié, que change l'intervention du notaire et quand un bail chez le notaire vaut vraiment le coût ? Explication claire pour bailleurs.",
        metaKeywords: "bail notarié définition, qu’est-ce qu’un bail notarié, contrat de location notarié, bail signé chez notaire, valeur juridique bail notarié, force exécutoire bail, sécurité juridique location, acte authentique location, bail notarié France",
        imageUrl: "/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir.jpg",
        ogImage: "/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir.jpg",
        createdAt: new Date("2025-05-01"),
        updatedAt: new Date("2025-11-27"),
        categoryId: "1",
      },
      {
        id: "blog-2",
        title: "Les étapes pour établir un bail notarié : guide complet",
        slug: generateSlug("Les étapes pour établir un bail notarié : guide complet"),
        description: "Guide étape par étape pour établir un bail notarié, de la préparation des documents à la signature chez le notaire.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 6, // Temps de lecture estimé en minutes
        metaTitle: "Faire un bail notarié : étapes, documents, coût et délais (2026)",
        metaDescription: "Comment établir un bail notarié en pratique : étapes, pièces à fournir, coût, délais et signature chez le notaire. Guide clair pour bailleurs en 2026.",
        metaKeywords: "étapes bail notarié, comment faire un bail notarié, procédure bail notarié, dossier bail notarié, documents bail notarié, signature bail chez notaire, créer un bail notarié en ligne, bail notarié processus, bail authentique démarches",        imageUrl: "/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet.jpg",
        ogImage: "/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet.jpg",
        createdAt: new Date("2025-05-10"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-3",
        title: "Force exécutoire : l'avantage majeur du bail notarié",
        slug: generateSlug("Force exécutoire : l'avantage majeur du bail notarié"),
        description: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige locatif.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 4, // Temps de lecture estimé en minutes
        metaTitle: "Bail déposé chez le notaire : est-ce un titre exécutoire ?",
        metaDescription: "Déposer ou enregistrer un bail sous seing privé chez le notaire ne suffit pas : seul l'acte authentique donne la force exécutoire. Ce que ça change.",
        metaKeywords: "force exécutoire bail notarié, bail ayant valeur de jugement, saisie loyers impayés, recouvrement par acte notarié, procédure sans juge loyer, titre exécutoire notaire, efficacité bail notarié, impayés locatifs solution",
        imageUrl: "/blog/force-executoire-lavantage-majeur-du-bail-notarie.jpg",
        ogImage: "/blog/force-executoire-lavantage-majeur-du-bail-notarie.jpg",
        createdAt: new Date("2025-05-15"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-4",
        title: "Bail notarié vs bail classique : analyse comparative",
        slug: generateSlug("Bail notarié vs bail classique : analyse comparative"),
        description: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 7, // Temps de lecture estimé en minutes
        metaTitle: "Bail notarié ou bail classique : lequel choisir ?",
        metaDescription: "Bail notarié ou sous seing privé : comparatif du coût, de la valeur juridique, du recouvrement des impayés et des cas où l'acte authentique vaut le prix.",
        metaKeywords: "bail notarié, bail classique, analyse comparative, propriétaire, locataire, notaire",
        imageUrl: "/blog/bail-notarie-vs-bail-classique-analyse-comparative.jpg",
        ogImage: "/blog/bail-notarie-vs-bail-classique-analyse-comparative.jpg",
        createdAt: new Date("2025-05-20"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-5",
        title: "Les obligations légales dans un bail notarié",
        slug: generateSlug("Les obligations légales dans un bail notarié"),
        description: "Découvrez les obligations légales spécifiques au bail notarié et comment elles protègent propriétaire et locataire.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 6, // Temps de lecture estimé en minutes
        metaTitle: "Les obligations légales dans un bail notarié",
        metaDescription: "Clauses obligatoires, règles légales, devoirs du bailleur et droits du locataire : tout savoir pour un bail notarié juridiquement conforme.",
        metaKeywords: "obligations bail notarié, clauses obligatoires bail, mentions légales bail, règles du bail notarié, conformité bail notaire, devoirs bailleur, droits locataire bail notarié, erreurs fréquemment bail, validité contrat de location",
        imageUrl: "/blog/les-obligations-legales-dans-un-bail-notarie.jpg",
        ogImage: "/blog/les-obligations-legales-dans-un-bail-notarie.jpg",
        createdAt: new Date("2025-05-25"),
        updatedAt: new Date("2025-11-27"),
        categoryId: "1",
      },
      {
        id: "blog-6",
        title: "Coût d'un bail de location notarié : tarifs, partage des frais et exemples concrets",
        slug: generateSlug("Coût d'un bail de location notarié : tarifs, partage des frais et exemples concrets"),
        description:
          "Tarifs réglementés, estimation du coût d'un bail de location notarié, partage bailleur/locataire et frais additionnels possibles (procurations à distance, copies, formalités, débours).",
        content: "",
        readTime: 6,
        metaTitle: "Combien coûte un bail de location notarié en France ?",
        metaDescription:
          "Prix d'un bail de location notarié en France : barème 2026, qui paie quoi, frais annexes et estimation claire selon le loyer.",
        metaKeywords:
          "bail notarié prix, coût bail de location notarié, coût bail notarié, frais bail de location notarié, frais bail notarié, tarif notaire bail habitation, emolument bail notarié, moitié loyer hors charges, procuration authentique à distance, copies formalités notaire, débours bail notarié",
        imageUrl: "/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets.jpg",
        ogImage: "/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets.jpg",
        createdAt: new Date("2025-09-01"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-7",
        title: "Bail Notarié à Distance : Signer en Sécurité avec la Procuration",
        slug: generateSlug("Bail Notarié à Distance : Signer en Sécurité avec la Procuration"),
        description:
          "Vous devez signer un bail notarié mais vous ne pouvez pas vous déplacer ? Découvrez comment la procuration notariée permet de signer à distance avec la même sécurité qu'un rendez-vous physique.",
        content: "",
        readTime: 5,
        metaTitle: "Bail notarié à distance : signer avec une procuration",
        metaDescription: "Signer un bail notarié sans se déplacer : procuration authentique, visioconférence chez le notaire, coût de la formalité et délais à prévoir.",
        metaKeywords:
          "bail notarié, bail notarié d'habitation, bail notarié en ligne, bail notarie en ligne, bail notarié à distance, procuration notariée, signature bail à distance, bail notarié visioconférence, signer bail notarié sans se déplacer, procuration authentique, signature électronique bail, bail notarié expatrié, bail notarié en ligne, signature notariée à distance",
        imageUrl: "/blog/bail-notarie-a-distance-signer-en-securite-avec-la-procuration.jpg",
        ogImage: "/blog/bail-notarie-a-distance-signer-en-securite-avec-la-procuration.jpg",
        createdAt: new Date("2025-06-15"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-8",
        title: "Saisie sur salaire et Bail Notarié : La procédure de recouvrement accélérée (Réforme 2025)",
        slug: generateSlug("Saisie sur salaire et Bail Notarié : La procédure de recouvrement accélérée (Réforme 2025)"),
        description:
          "Le décret du 1er juillet 2025 a déjudiciarisé la saisie sur salaire. Découvrez comment le Bail Notarié permet d'activer cette procédure de recouvrement accélérée sans passer par les tribunaux.",
        content: "",
        readTime: 7,
        metaTitle: "Saisie sur salaire avec bail notarié : procédure 2025-2026",
        metaDescription:
          "Loyers impayés : comment activer la saisie sur salaire avec un bail notarié (titre exécutoire), les étapes et délais depuis la réforme 2025.",
        metaKeywords:
          "saisie sur salaire, saisie sur salaire bail notarié, recouvrement loyers impayés 2025, décret 2025-125 saisie rémunérations, titre exécutoire notarié, commandement de payer loyer, commissaire de justice saisie salaire, quotité saisissable loyer, procédure recouvrement locatif, bail notarié force exécutoire, saisie rémunérations sans juge, recouvrement accéléré loyers, impayés locatifs solution 2025",
        imageUrl: "/blog/saisie-sur-salaire-et-bail-notarie-la-procedure-de-recouvrement-acceleree-reforme-2025.jpg",
        ogImage: "/blog/saisie-sur-salaire-et-bail-notarie-la-procedure-de-recouvrement-acceleree-reforme-2025.jpg",
        createdAt: new Date("2025-07-01"),
        updatedAt: new Date("2026-01-20"),
        categoryId: "1",
      },
      {
        id: "blog-9",
        title: "Diagnostics Immobiliers 2026 : Durées de validité, coûts et pièges juridiques",
        slug: generateSlug("Diagnostics Immobiliers 2026 : Durées de validité, coûts et pièges juridiques"),
        description:
          "Guide complet des diagnostics techniques immobiliers (DDT) : validité illimitée, temporaire ou volatile. Découvrez les durées de validité, les coûts et les risques juridiques à éviter en 2026.",
        content: "",
        readTime: 8,
        metaTitle: "Diagnostics immobiliers 2026 : validité, coûts et pièges",
        metaDescription: "DPE, amiante, plomb, électricité, gaz : durée de validité, coût de chaque diagnostic et conséquences d'un document périmé sur votre bail.",
        metaKeywords:
          "diagnostics immobiliers, DDT dossier diagnostic technique, validité diagnostics immobiliers, DPE durée validité, diagnostic amiante validité, CREP plomb validité, diagnostic électricité gaz, ERP état risques pollutions, diagnostics périmés, loi ALUR diagnostics, diagnostics location vente, coût diagnostics immobiliers, sanctions diagnostics manquants",
        imageUrl: "/blog/diagnostics-immobiliers-2026-durees-de-validite-couts-et-pieges-juridiques.jpg",
        ogImage: "/blog/diagnostics-immobiliers-2026-durees-de-validite-couts-et-pieges-juridiques.jpg",
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-20"),
        categoryId: "1",
      },
      {
        id: "blog-10",
        title: "Bail Notarié et Expulsion : Efficacité Juridique et Stratégie de Recouvrement",
        slug: generateSlug("Bail Notarié et Expulsion : Efficacité Juridique et Stratégie de Recouvrement"),
        description:
          "Analyse de la portée juridique du bail notarié : s'il ne dispense pas d'une décision de justice pour l'expulsion, il constitue le levier le plus puissant en matière de recouvrement de créances.",
        content: "",
        readTime: 6,
        metaTitle: "Bail notarié et expulsion : plus rapide ou pas ? La réponse",
        metaDescription: "Non, le bail notarié n'accélère pas l'expulsion : le juge reste obligatoire. En revanche il permet de saisir les loyers impayés sans jugement. On détaille.",
        metaKeywords:
          "expulsion locataire, expulsion locative, bail notarié expulsion, titre exécutoire bail notarié, recouvrement loyers impayés, saisie conservatoire bail notarié, saisie rémunérations bail notarié, force exécutoire acte notarié, procédure expulsion locative, recouvrement créances locatives, bail notarié avantages, acte authentique location, sécurité juridique bailleur, impayés locatifs solution",
        imageUrl: "/blog/bail-notarie-et-expulsion-efficacite-juridique-et-strategie-de-recouvrement.jpg",
        ogImage: "/blog/bail-notarie-et-expulsion-efficacite-juridique-et-strategie-de-recouvrement.jpg",
        createdAt: new Date("2026-01-20"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-11",
        title: "Bail authentique chez le notaire : définition, prix et procédure",
        slug: "bail-authentique-notaire",
        description:
          "Le bail authentique est un bail notarié : définition, avantages, prix, répartition des frais et procédure complète pour une location d'habitation en France.",
        content: "",
        readTime: 8,
        metaTitle: "Bail authentique chez le notaire : ce que ça change",
        metaDescription: "Ce que l'acte authentique change face à un bail sous seing privé : force probante, date certaine, titre exécutoire et déroulé de la signature chez le notaire.",
        metaKeywords:
          "bail authentique notaire, bail authentique, acte authentique bail de location, prix bail authentique, coût bail authentique, différence bail authentique bail classique, bail de location en France",
        imageUrl: "/blog/bail-authentique-notaire.jpg",
        ogImage: "/blog/bail-authentique-notaire.jpg",
        createdAt: new Date("2026-03-08"),
        updatedAt: new Date("2026-03-16"),
        categoryId: "1",
      },
      {
        id: "blog-12",
        title: "BailNotarie : la plateforme qui simplifie la préparation des baux notariés",
        slug: "bailnotarie-plateforme-digitale-bail-notarie",
        description:
          "Découvrez BailNotarie, la plateforme digitale qui structure, qualifie et transmet les dossiers de bail notarié aux notaires partenaires partout en France.",
        content: "",
        readTime: 7,
        metaTitle: "BailNotarie : préparer son bail notarié en ligne",
        metaDescription: "Comment BailNotarie prépare votre dossier de bail notarié : collecte des pièces, vérification, transmission au notaire partenaire et suivi jusqu'à la signature.",
        metaKeywords:
          "BailNotarie, plateforme bail notarié, préparation bail notarié, dossier bail notarié, plateforme digitale notaire, infrastructure digitale bail, notaires partenaires, bail notarié en France",
        imageUrl: "/blog/bailnotarie-plateforme-digitale-bail-notarie.jpg",
        ogImage: "/blog/bailnotarie-plateforme-digitale-bail-notarie.jpg",
        createdAt: new Date("2026-03-08"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-13",
        title: "Bail commercial notarié : notaire, coût, obligations et bail 3/6/9",
        slug: "bail-commercial-notarie-contrat-3-6-9",
        description:
          "Bail commercial notarié : découvrez pourquoi passer par un notaire pour votre bail 3/6/9, le rôle du titre exécutoire, les obligations, l'enregistrement et le coût.",
        content: "",
        readTime: 8,
        metaTitle: "Bail commercial notarié : quand le notaire est obligatoire",
        metaDescription: "Le notaire est-il obligatoire pour un bail commercial ? Le cas des baux de plus de 12 ans, le titre exécutoire et le coût réel de l'acte.",
        metaKeywords:
          "bail commercial notarié, bail commercial notaire, bail 3/6/9 notarié, coût bail commercial notarié, notaire bail commercial, acte authentique bail commercial, enregistrement bail commercial, titre exécutoire bail commercial",
        imageUrl: "/blog/bail-commercial-notarie-contrat-3-6-9.jpg",
        ogImage: "/blog/bail-commercial-notarie-contrat-3-6-9.jpg",
        createdAt: new Date("2026-03-08"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-14",
        title: "Bail dérogatoire : article L.145-5, durée, requalification et pièges",
        slug: "bail-derogatoire-article-l145-5-code-commerce",
        description:
          "Bail dérogatoire : définition juridique, conditions de validité, durée maximale de 36 mois, risque de requalification et points clés de l'article L.145-5 du Code de commerce.",
        content: "",
        readTime: 8,
        metaTitle: "Bail dérogatoire : durée maximale, risques et L.145-5",
        metaDescription: "Bail dérogatoire : durée maximale de 3 ans, différence avec la convention d'occupation précaire et risque de requalification en bail commercial 3/6/9.",
        metaKeywords:
          "bail dérogatoire, article L145-5, article L.145-5 Code de commerce, bail précaire, durée bail dérogatoire, requalification bail commercial, bail de courte durée commercial, convention d'occupation précaire",
        imageUrl: "/blog/bail-derogatoire-article-l145-5-code-commerce.jpg",
        ogImage: "/blog/bail-derogatoire-article-l145-5-code-commerce.jpg",
        createdAt: new Date("2026-03-08"),
        updatedAt: new Date("2026-03-08"),
        categoryId: "1",
      },
      {
        id: "blog-15",
        title: "Bail Commercial : Guide Complet 2026 — Définition, Durée, Loyer, Notaire",
        slug: "bail-commercial",
        description:
          "Tout comprendre au bail commercial : définition, durée 3/6/9, conditions d'éligibilité, loyer, renouvellement, résiliation, indemnité d'éviction, rôle du notaire et honoraires.",
        content: "",
        readTime: 18,
        metaTitle: "Bail commercial 3/6/9 : durée, loyer, résiliation (2026)",
        metaDescription: "Comment fonctionne un bail commercial 3/6/9 : durée, révision du loyer, congé triennal, renouvellement, indemnité d'éviction et rôle du notaire.",
        metaKeywords:
          "bail commercial, bail commercial définition, durée bail commercial, bail commercial 3 6 9, loyer bail commercial, renouvellement bail commercial, résiliation bail commercial, indemnité d'éviction bail commercial, bail commercial notarié, contenu bail commercial, charges bail commercial, bail commercial notaire, clause bail commercial, fonds de commerce, local commercial, droit au bail, commerçant locataire, bail commercial prix, bail commercial obligations, statut baux commerciaux",
        imageUrl: "/blog/bail-commercial.jpg",
        ogImage: "/blog/bail-commercial.jpg",
        createdAt: new Date("2026-03-24"),
        updatedAt: new Date("2026-04-13"),
        categoryId: "1",
      },
      {
        id: "blog-16",
        title: "Location meublée ou location nue : quelles différences ?",
        slug: generateSlug("Location meublée ou location nue : quelles différences ?"),
        description:
          "Location meublée ou location nue : comparez la durée du bail, le préavis, la fiscalité, la rentabilité et le profil de locataire pour faire le bon choix.",
        content: "",
        readTime: 6,
        metaTitle: "Location meublée ou nue : quelles différences ?",
        metaDescription: "Bail, préavis, fiscalité, rentabilité : le comparatif complet entre location nue et location meublée pour choisir le régime adapté à votre bien.",
        metaKeywords:
          "location meublée ou nue, différence location meublée location vide, louer vide ou meublé, fiscalité location meublée, fiscalité location nue, LMNP, revenus fonciers, micro-BIC, micro-foncier, bail meublé durée, bail location nue, décret mobilier location meublée, bail étudiant, bail mobilité, rentabilité location meublée",
        imageUrl: "/blog/location-meublee-ou-location-nue-quelles-differences.jpg",
        ogImage: "/blog/location-meublee-ou-location-nue-quelles-differences.jpg",
        createdAt: new Date("2026-07-19"),
        updatedAt: new Date("2026-07-19"),
        categoryId: "1",
      },
]