import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { LpNav } from "@/components/lp/lp-nav"
import { Footer } from "@/components/footer"
import { blogData, blogCategories } from '@/lib/blog-data'
import { generateArticleMetadata } from '@/lib/blog-utils'
import { BlogPageClient } from '@/components/blog-page-client'
import { ArticleSchema } from '@/components/seo/article-schema'
import { FaqSchema } from '@/components/seo/faq-schema'
import { BreadcrumbSchema } from '@/components/seo/breadcrumb-schema'
import { LATEST_IRL, formatIrl } from '@/lib/irl'

// ISR : les articles sont statiques (contenu dans lib/blog-data.ts + composants
// React figes). Ils sont pre-rendus au build via generateStaticParams et
// revalides toutes les heures. Les commentaires, seule donnee mouvante, sont
// charges cote client par CommentsSection via GET /api/comments.
export const revalidate = 3600;

// Fonction pour générer les paramètres statiques
export function generateStaticParams() {
  return blogData.map((article) => ({
    slug: article.slug,
  }))
}

// Fonction pour générer les métadonnées
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  const article = blogData.find(a => a.slug === slug);
  const category = article ? blogCategories.find(cat => cat.id === article.categoryId) : null;

  if (!article || !category) {
    return {
      title: 'Article non trouvé - Blog BailNotarie',
      description: 'L\'article que vous recherchez n\'existe pas.',
      robots: {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
        },
      },
      alternates: {
        canonical: "/blog",
      },
    }
  }

  // Adapter l'article au format attendu par generateArticleMetadata
  const articleForMetadata = {
    ...article,
    category,
  } as any;

  return generateArticleMetadata(articleForMetadata);
}

// Fonction pour récupérer l'article
function getArticle(slug: string) {
  const article = blogData.find(a => a.slug === slug);

  if (!article) {
    notFound()
  }

  const category = blogCategories.find(cat => cat.id === article.categoryId) || blogCategories[0];

  // Les commentaires ne sont plus charges ici : CommentsSection les recupere
  // au montage via GET /api/comments. Les rendre cote serveur forcait la page
  // en dynamique (aller-retour base a chaque visite) pour un resultat aussitot
  // remplace cote client.
  return {
    ...article,
    category,
    comments: [],
  }
}

function getFaqForSlug(slug: string) {
  if (slug === "bail-commercial") {
    return [
      {
        question: "Qu'est-ce qu'un bail commercial ?",
        answer:
          "Le bail commercial est un contrat de location d'un local dans lequel est exploité un fonds de commerce ou artisanal. Il est régi par les articles L.145-1 et suivants du Code de commerce et offre au locataire commerçant une protection forte : durée minimale de 9 ans, droit au renouvellement et indemnité d'éviction en cas de refus.",
      },
      {
        question: "Quelle est la durée d'un bail commercial ?",
        answer:
          "La durée minimale d'un bail commercial est de 9 ans. C'est la règle des 3/6/9 : le locataire peut donner congé à l'expiration de chaque période triennale (3 ans, 6 ans ou 9 ans) avec un préavis de 6 mois. Le bailleur ne peut pas mettre fin au bail avant les 9 ans, sauf exceptions strictement limitées par la loi.",
      },
      {
        question: "Qui peut bénéficier d'un bail commercial ?",
        answer:
          "Le bail commercial bénéficie aux commerçants immatriculés au RCS (Registre du Commerce et des Sociétés) et aux artisans immatriculés au RNE (Registre National des Entreprises). Les professions libérales (médecins, avocats, architectes...) ne peuvent pas en bénéficier : elles relèvent du bail professionnel.",
      },
      {
        question: "Comment fonctionne le renouvellement du bail commercial ?",
        answer:
          "À l'expiration du bail de 9 ans, le locataire bénéficie d'un droit au renouvellement. Il peut demander le renouvellement dans les 6 mois avant l'expiration. Si le bailleur refuse, il doit verser une indemnité d'éviction, qui représente généralement la valeur marchande du fonds de commerce.",
      },
      {
        question: "Qu'est-ce que l'indemnité d'éviction ?",
        answer:
          "L'indemnité d'éviction est la compensation financière due par le bailleur au locataire lorsqu'il refuse le renouvellement du bail commercial. Elle couvre la valeur marchande du fonds de commerce, les frais de déménagement et de réinstallation. Son montant peut atteindre plusieurs centaines de milliers d'euros pour un fonds important.",
      },
      {
        question: "Comment est fixé et révisé le loyer d'un bail commercial ?",
        answer:
          "Le loyer initial est librement fixé entre les parties. En cours de bail, il peut être révisé tous les 3 ans, mais la révision est plafonnée à la variation de l'indice ILC (commerces) ou ILAT (activités tertiaires). Une clause d'indexation annuelle peut prévoir une actualisation automatique selon ces indices.",
      },
      {
        question: "Le notaire est-il obligatoire pour un bail commercial ?",
        answer:
          "Non, pas pour un bail commercial de 9 ans standard. En revanche, si la durée convenue dépasse 12 ans, la loi impose la forme authentique (acte notarié). Même sans obligation légale, recourir à un notaire offre des avantages décisifs : acte authentique, titre exécutoire pour le recouvrement des loyers impayés, et sécurité juridique renforcée.",
      },
      {
        question: "Combien coûte la rédaction d'un bail commercial ?",
        answer:
          "La rédaction d'un bail commercial coûte environ 500 à 2 000 € chez un avocat (bail sous seing privé) ou 1 500 à 4 000 € chez un notaire (acte authentique), selon la complexité et le loyer. Pour un bail de plus de 12 ans nécessitant un acte notarié et une publication, le coût peut atteindre 6 000 €.",
      },
      {
        question: "Quelle est la différence entre bail commercial et bail professionnel ?",
        answer:
          "Le bail commercial (durée 9 ans, droit au renouvellement, indemnité d'éviction) s'adresse aux commerçants et artisans immatriculés. Le bail professionnel (durée 6 ans, pas de droit au renouvellement) s'adresse aux professions libérales. Le bail commercial offre une protection beaucoup plus forte pour le locataire.",
      },
    ];
  }

  if (slug === "bail-derogatoire-article-l145-5-code-commerce") {
    return [
      {
        question: "Qu'est-ce qu'un bail dérogatoire ?",
        answer:
          "Le bail dérogatoire est un contrat de location commerciale de courte durée conclu hors statut des baux commerciaux, dans la limite de 36 mois.",
      },
      {
        question: "Quelle est la durée maximale d'un bail dérogatoire ?",
        answer:
          "La durée totale du bail dérogatoire, renouvellements et avenants compris, ne peut pas dépasser 36 mois.",
      },
      {
        question: "Quelle différence entre bail dérogatoire et convention d'occupation précaire ?",
        answer:
          "Le bail dérogatoire repose sur une durée courte prévue par l'article L.145-5, tandis que la convention d'occupation précaire repose sur une situation objective de précarité.",
      },
      {
        question: "Quand y a-t-il un risque de requalification en bail commercial ?",
        answer:
          "Le risque apparaît notamment si la durée maximale est dépassée ou si le locataire reste dans les lieux après l'échéance sans opposition du bailleur dans le délai utile.",
      },
      {
        question: "Faut-il mentionner l'article L.145-5 dans le contrat ?",
        answer:
          "Oui, il est fortement recommandé de viser expressément l'article L.145-5 du Code de commerce pour rendre la volonté de déroger au statut des baux commerciaux claire et non équivoque.",
      },
    ];
  }

  if (slug === "bailnotarie-plateforme-digitale-bail-notarie") {
    return [
      {
        question: "Qu'est-ce que BailNotarie ?",
        answer:
          "BailNotarie est une plateforme digitale qui prépare les dossiers de bail notarié, les structure et les transmet à des notaires partenaires pour signature.",
      },
      {
        question: "BailNotarie est-il un notaire ?",
        answer:
          "Non. BailNotarie n'est pas une étude notariale. La plateforme intervient en amont pour fluidifier la constitution du dossier, tandis que l'acte authentique est signé devant notaire.",
      },
      {
        question: "Que fait concrètement BailNotarie ?",
        answer:
          "La plateforme collecte les pièces, organise les informations, facilite la transmission au notaire et permet un suivi plus fluide du dossier.",
      },
      {
        question: "À qui s'adresse BailNotarie ?",
        answer:
          "BailNotarie s'adresse aux bailleurs, professionnels de l'immobilier, gestionnaires et notaires qui souhaitent des dossiers plus structurés et plus rapides à traiter.",
      },
      {
        question: "Pourquoi passer par BailNotarie pour préparer un bail notarié ?",
        answer:
          "Parce qu'un dossier mieux préparé réduit les oublis, les allers-retours et les délais avant signature, tout en améliorant la lisibilité pour l'étude notariale.",
      },
    ];
  }

  if (slug === "bail-commercial-notarie-contrat-3-6-9") {
    return [
      {
        question: "Pourquoi faire un bail commercial notarié ?",
        answer:
          "Le bail commercial notarié offre un acte authentique, une meilleure force probante et un titre exécutoire utile pour le recouvrement des loyers impayés.",
      },
      {
        question: "Le notaire est-il obligatoire pour un bail commercial 3/6/9 ?",
        answer:
          "Non, pas dans la majorité des cas. En revanche, certaines situations particulières rendent le recours au notaire nécessaire, notamment pour certains baux de longue durée.",
      },
      {
        question: "Combien coûte un bail commercial notarié ?",
        answer:
          "Le coût n'est pas encadré comme en bail d'habitation. Il dépend de l'étude notariale et de la complexité du dossier, souvent avec un raisonnement en forfait ou sur la triennale.",
      },
      {
        question: "L'enregistrement du bail commercial est-il automatique chez le notaire ?",
        answer:
          "Avec un notaire, l'enregistrement et la date certaine sont en pratique beaucoup plus simples à obtenir dans le cadre de l'acte authentique.",
      },
      {
        question: "Le bail commercial notarié permet-il d'expulser sans juge ?",
        answer:
          "Non. Le titre exécutoire aide surtout au recouvrement des sommes dues. Pour l'expulsion, une procédure judiciaire reste nécessaire.",
      },
    ];
  }

  if (slug === "bail-authentique-notaire") {
    return [
      {
        question: "C'est quoi un bail authentique chez le notaire ?",
        answer:
          "Un bail authentique est un bail notarié : un contrat de location rédigé et signé devant notaire, avec la valeur juridique d'un acte authentique.",
      },
      {
        question: "Combien coûte un bail authentique ?",
        answer:
          "Le coût dépend du loyer, des formalités et des options du dossier. Une base proche d'un demi-loyer hors charges est souvent observée, avec TVA et frais éventuels.",
      },
      {
        question: "Qui paie les frais ?",
        answer:
          "Les frais peuvent être répartis entre bailleur et locataire selon les règles légales, avec des plafonds pour la part imputable au locataire.",
      },
      {
        question: "Quelle différence avec un bail classique ?",
        answer:
          "Le bail authentique (notarié) offre une sécurité juridique renforcée et une exécution plus efficace en cas d'impayés, contrairement au bail sous seing privé.",
      },
      {
        question: "Est-ce obligatoire ?",
        answer:
          "Non. Le bail authentique n'est pas obligatoire en location d'habitation, mais il est souvent choisi pour sa sécurité juridique et sa force exécutoire.",
      },
    ];
  }

  if (slug === "cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets") {
    return [
      {
        question: "Quel est le prix d'un bail notarié ?",
        answer:
          "Le coût se situe en général autour d'un demi-loyer hors charges, auquel s'ajoutent la TVA et des frais de formalités selon le dossier.",
      },
      {
        question: "Qui paie les frais du bail notarié ?",
        answer:
          "Les frais peuvent être partagés entre bailleur et locataire. La part du locataire est plafonnée par la loi et ne peut pas dépasser celle du bailleur.",
      },
      {
        question: "Pourquoi un bail notarié coûte-t-il plus cher qu'un bail classique ?",
        answer:
          "Le bail notarié est un acte authentique avec force exécutoire, ce qui apporte une sécurité juridique supérieure et facilite le recouvrement en cas d'impayés.",
      },
      {
        question: "Quels frais s'ajoutent au tarif du bail notarié ?",
        answer:
          "Selon le dossier, des frais de copies, formalités, débours ou procuration peuvent s'ajouter au tarif principal.",
      },
      {
        question: "Le bail notarié est-il obligatoire ?",
        answer:
          "Non, il n'est pas obligatoire en location d'habitation. En revanche, il est souvent choisi pour sa force exécutoire et sa sécurité juridique.",
      },
    ];
  }

  if (slug === "location-meublee-ou-location-nue-quelles-differences") {
    return [
      {
        question: "Quelle est la différence entre une location nue et une location meublée ?",
        answer:
          "La location nue est proposée sans mobilier et vise une occupation durable, avec un bail de 3 ans minimum (6 ans pour une personne morale). La location meublée comprend un mobilier suffisant pour vivre immédiatement, fixé par le décret n° 2015-981, avec un bail généralement d'1 an. La fiscalité diffère également : revenus fonciers pour la location nue, BIC pour la location meublée.",
      },
      {
        question: "Quelle est la durée du bail en location meublée et en location nue ?",
        answer:
          "En location nue, le bail est de 3 ans minimum lorsque le bailleur est une personne physique ou une SCI familiale, et de 6 ans minimum pour une personne morale. En location meublée, le bail est généralement d'1 an renouvelable tacitement. Il existe aussi le bail étudiant (9 mois, non renouvelable) et le bail mobilité (1 à 10 mois, non renouvelable).",
      },
      {
        question: "Quelle fiscalité pour la location meublée et la location nue ?",
        answer:
          "Les loyers d'une location nue sont imposés dans la catégorie des revenus fonciers (micro-foncier avec abattement de 30 % jusqu'à 15 000 €, ou régime réel). Les loyers d'une location meublée relèvent des Bénéfices Industriels et Commerciaux (BIC), au micro-BIC ou au régime réel, ce dernier permettant sous conditions d'amortir le bien (hors terrain) et le mobilier.",
      },
      {
        question: "Quel mobilier est obligatoire dans une location meublée ?",
        answer:
          "Le décret n° 2015-981 du 31 juillet 2015 impose notamment une literie, des plaques de cuisson, un réfrigérateur et un congélateur (ou compartiment de conservation), des ustensiles et de la vaisselle, des luminaires, ainsi qu'une table, des sièges et des espaces de rangement.",
      },
      {
        question: "Peut-on faire un bail notarié pour une location meublée ou nue ?",
        answer:
          "Oui. Un bail notarié peut être conclu aussi bien pour une location nue que pour une location meublée. Établi sous forme d'acte authentique par un notaire, il bénéficie de la force exécutoire, ce qui facilite notamment le recouvrement des loyers impayés selon les procédures prévues par la loi.",
      },
    ];
  }

  if (slug === "preavis-location-1-mois-ou-3-mois") {
    return [
      {
        question: "Quel est le préavis pour quitter une location ?",
        answer:
          "Le préavis du locataire est de 3 mois pour une location vide et de 1 mois pour une location meublée, un bail étudiant ou un bail mobilité. En location vide, il est réduit à 1 mois en zone tendue ou dans les situations prévues par l'article 15 de la loi du 6 juillet 1989.",
      },
      {
        question: "Comment bénéficier d'un préavis d'un mois en location vide ?",
        answer:
          "Le logement doit être situé en zone tendue, ou le locataire doit se trouver dans l'un des cas prévus par la loi : premier emploi, mutation, perte d'emploi ou nouvel emploi consécutif à une perte d'emploi, état de santé constaté par certificat médical, bénéfice du RSA ou de l'AAH, attribution d'un logement social ou certaines situations de violences. Le motif doit être indiqué et justifié dans la lettre de congé.",
      },
      {
        question: "Comment savoir si mon logement est en zone tendue ?",
        answer:
          "La liste des communes en zone tendue est fixée par décret et a été élargie en 2023. Le simulateur officiel de Service Public permet de vérifier une commune en quelques secondes. Pour bénéficier du préavis d'un mois, mentionnez expressément la zone tendue dans votre lettre.",
      },
      {
        question: "Le préavis commence-t-il à l'envoi ou à la réception de la lettre ?",
        answer:
          "À la réception. Le préavis court à partir de la réception effective de la lettre recommandée, de la remise en main propre ou de la signification par commissaire de justice. Une lettre recommandée non retirée et retournée à l'expéditeur ne fait pas courir le délai.",
      },
      {
        question: "Peut-on envoyer son préavis par email ?",
        answer:
          "Non, un simple email ne constitue pas un congé valable. La lettre recommandée électronique est possible sous conditions, notamment l'accord préalable du bailleur lorsqu'il est un particulier.",
      },
      {
        question: "Faut-il payer le loyer pendant le préavis si l'on part plus tôt ?",
        answer:
          "Oui, le loyer et les charges restent dus jusqu'à la fin du préavis, même si le logement est vide. Le paiement cesse plus tôt si un nouveau locataire entre dans les lieux avec l'accord du bailleur, ou si les parties conviennent par écrit d'une fin anticipée.",
      },
    ];
  }

  if (slug === "etat-des-lieux-de-sortie") {
    return [
      {
        question: "Qui paie l'état des lieux de sortie ?",
        answer:
          "Établi par le locataire et le bailleur, il est gratuit. Réalisé par un professionnel mandaté par le bailleur, il ne peut pas être facturé au locataire. S'il est établi par un commissaire de justice faute d'accord, le coût, réglementé, est partagé par moitié.",
      },
      {
        question: "Quelle est la différence entre vétusté et dégradation ?",
        answer:
          "La vétusté est l'usure due au temps et à un usage normal : elle ne peut entraîner aucune retenue sur le dépôt de garantie. La dégradation résulte d'un usage anormal ou d'un accident imputable au locataire. Une grille de vétusté convenue au bail aide à chiffrer la part éventuellement due.",
      },
      {
        question: "Que faire en cas de désaccord sur l'état des lieux de sortie ?",
        answer:
          "Faites corriger les mentions inexactes avant de signer ou portez des réserves explicites. Si l'état des lieux amiable est impossible, l'une des parties peut faire appel à un commissaire de justice, qui convoque les deux parties au moins 7 jours à l'avance. La commission départementale de conciliation peut aussi être saisie gratuitement.",
      },
      {
        question: "Que se passe-t-il sans état des lieux d'entrée ?",
        answer:
          "Le locataire est présumé avoir reçu le logement en bon état et doit le rendre ainsi, sauf preuve contraire. Cette présomption ne joue pas si le bailleur a fait obstacle à l'établissement de l'état des lieux d'entrée.",
      },
      {
        question: "Quel délai pour récupérer le dépôt de garantie après l'état des lieux ?",
        answer:
          "Le délai court à la remise des clés : un mois si l'état des lieux de sortie est conforme à celui d'entrée, deux mois s'il y a des différences. Les retenues doivent être justifiées par des devis, factures ou décomptes.",
      },
    ];
  }

  if (slug === "revision-loyer-calcul-irl") {
    return [
      {
        question: "Comment calculer la révision du loyer ?",
        answer:
          "Nouveau loyer = loyer mensuel hors charges × nouvel IRL ÷ IRL du même trimestre de l'année précédente. Le trimestre de référence est celui prévu dans la clause de révision du bail ; à défaut, on retient le dernier indice publié à la signature du contrat.",
      },
      {
        question: "Quel est le dernier indice de référence des loyers ?",
        answer: `Le dernier IRL publié par l'Insee, pour le ${LATEST_IRL.quarter === 1 ? "1er" : `${LATEST_IRL.quarter}e`} trimestre ${LATEST_IRL.year}, s'établit à ${formatIrl(LATEST_IRL.value)} en France métropolitaine. Un nouvel indice est publié chaque trimestre.`,
      },
      {
        question: "Le propriétaire peut-il augmenter le loyer sans clause de révision ?",
        answer:
          "Non. La révision annuelle n'est possible que si le bail contient une clause de révision. Sans elle, le loyer ne peut pas être augmenté à ce titre en cours de bail.",
      },
      {
        question: "Une révision de loyer oubliée peut-elle être réclamée rétroactivement ?",
        answer:
          "Non. Le bailleur dispose d'un an à compter de la date prévue pour demander la révision, qui prend effet à la date de la demande, sans rattrapage des mois passés. Au-delà d'un an, la révision de l'année écoulée est perdue.",
      },
      {
        question: "Peut-on réviser le loyer d'un logement classé F ou G ?",
        answer:
          "Non. La révision est interdite pour les logements classés F ou G au DPE lorsque le bail a été signé, renouvelé ou tacitement reconduit depuis le 24 août 2022 en métropole, ou depuis le 1er juillet 2024 dans les territoires ultramarins concernés.",
      },
    ];
  }

  if (slug === "depot-de-garantie-location") {
    return [
      {
        question: "Quel est le montant maximum du dépôt de garantie ?",
        answer:
          "Un mois de loyer hors charges pour une location vide, deux mois pour une location meublée classique. Aucun dépôt de garantie ne peut être demandé dans un bail mobilité. Ce sont des plafonds, pas des montants obligatoires.",
      },
      {
        question: "Quel est le délai de restitution du dépôt de garantie ?",
        answer:
          "Un mois à compter de la remise des clés si l'état des lieux de sortie est conforme à celui d'entrée, deux mois s'il présente des différences. En copropriété, une provision justifiée de 20 % au plus peut être conservée jusqu'à l'arrêté annuel des comptes.",
      },
      {
        question: "Que faire si la caution n'est pas rendue après 2 mois ?",
        answer:
          "Demandez un décompte écrit, puis adressez une mise en demeure par lettre recommandée avec avis de réception. Le solde dû est majoré de 10 % du loyer mensuel hors charges pour chaque mois de retard commencé. En l'absence d'accord, saisissez un conciliateur ou la commission départementale de conciliation, puis le juge si nécessaire.",
      },
      {
        question: "Quelles retenues le propriétaire peut-il faire sur le dépôt de garantie ?",
        answer:
          "Les loyers et charges restant dus et les réparations de dégradations imputables au locataire, sur justificatifs (états des lieux, devis, factures). L'usure normale liée au temps ne peut pas être retenue.",
      },
      {
        question: "Quelle est la différence entre dépôt de garantie et caution ?",
        answer:
          "Le dépôt de garantie est une somme versée au bailleur à la signature du bail. La caution est une personne ou un organisme qui s'engage à payer les dettes locatives si le locataire ne le fait pas.",
      },
    ];
  }

  if (slug === "conge-pour-reprise-recuperer-son-logement") {
    return [
      {
        question: "Comment récupérer son logement loué pour y habiter ?",
        answer:
          "Le propriétaire doit délivrer un congé pour reprise à l'échéance du bail. Le congé indique le bénéficiaire (le propriétaire ou un proche autorisé), son adresse et son lien avec le bailleur, et le projet doit être réel et sérieux. Le locataire doit le recevoir au moins 6 mois avant l'échéance en location vide, 3 mois en meublé.",
      },
      {
        question: "Quel est le délai d'un congé pour reprise ?",
        answer:
          "Le congé doit être reçu par le locataire au moins 6 mois avant l'échéance du bail pour une location vide, et au moins 3 mois avant pour une location meublée classique. C'est la date de réception qui compte, pas celle de l'envoi.",
      },
      {
        question: "Pour qui peut-on donner un congé pour reprise ?",
        answer:
          "Pour le propriétaire lui-même, son conjoint, son partenaire de Pacs, son concubin notoire depuis au moins un an, ses ascendants et descendants ou ceux de son conjoint, partenaire ou concubin.",
      },
      {
        question: "Le locataire est-il prioritaire en cas de congé pour vente ?",
        answer:
          "En location vide, oui : le congé pour vente vaut offre de vente au locataire, qui bénéficie d'un droit de préemption, sauf exceptions légales. En location meublée classique, le congé pour vendre ne donne pas ce droit de priorité.",
      },
      {
        question: "Peut-on donner congé à un locataire de plus de 65 ans ?",
        answer:
          "Si le locataire a plus de 65 ans et des ressources inférieures à un plafond, le bailleur doit lui proposer un relogement adapté, sauf s'il est lui-même âgé de plus de 65 ans ou dispose de ressources modestes.",
      },
      {
        question: "Que faire si le locataire ne part pas à l'échéance ?",
        answer:
          "Le propriétaire ne peut pas changer les serrures ni le contraindre lui-même à partir, sous peine de sanctions pénales. Il doit saisir le juge pour obtenir une décision d'expulsion, qui ne peut pas être exécutée pendant la trêve hivernale, du 1er novembre au 31 mars.",
      },
    ];
  }

  if (slug === "choisir-un-locataire-dossier-verifications") {
    return [
      {
        question: "Quels documents peut-on demander à un locataire ?",
        answer:
          "La liste est fixée par le décret du 5 novembre 2015 : une pièce d'identité, un justificatif de domicile, un justificatif d'activité professionnelle et des justificatifs de ressources (avis d'imposition, bulletins de salaire, bilans pour un indépendant, pension ou bourse).",
      },
      {
        question: "Quels documents un propriétaire n'a-t-il pas le droit de demander ?",
        answer:
          "Notamment un relevé de compte bancaire, une attestation de bonne tenue de compte, un extrait de casier judiciaire, un dossier médical, la carte Vitale, un contrat de mariage ou un chèque de réservation. Le bailleur s'expose à une amende jusqu'à 3 000 €, 15 000 € pour une société.",
      },
      {
        question: "La règle des 3 fois le loyer est-elle obligatoire ?",
        answer:
          "Non, aucun texte ne l'impose. C'est un repère courant qui rapporte les revenus nets du foyer au loyer charges comprises. Les assurances loyers impayés fixent en revanche leurs propres critères, à vérifier avant de retenir un candidat.",
      },
      {
        question: "Comment vérifier un dossier de locataire ?",
        answer:
          "Croisez les pièces entre elles (identité, employeur, montants, dates), vérifiez l'avis d'impôt avec le service officiel de l'administration fiscale et posez une question précise en cas d'incohérence. Le service public DossierFacile permet aussi aux candidats de présenter un dossier vérifié.",
      },
      {
        question: "Peut-on demander une caution et une assurance loyers impayés ?",
        answer:
          "En principe non : un bailleur qui a souscrit une assurance loyers impayés ne peut pas exiger en plus une caution, sauf si le locataire est étudiant ou apprenti.",
      },
    ];
  }

  if (slug === "sous-location-illegale-locataire-sous-loue") {
    return [
      {
        question: "Un locataire peut-il sous-louer sans l'accord du propriétaire ?",
        answer:
          "Non. Pour une location privée soumise à la loi du 6 juillet 1989, la sous-location exige l'accord écrit du bailleur, sur le principe comme sur le montant du sous-loyer. Le locataire doit remettre au sous-locataire cette autorisation et une copie du bail en cours.",
      },
      {
        question: "Quel est le montant maximum d'un sous-loyer ?",
        answer:
          "Le loyer au mètre carré de surface habitable demandé au sous-locataire ne peut pas dépasser celui payé par le locataire principal. Pour une pièce de 12 m² dans un logement de 45 m² loué 900 €, le sous-loyer est plafonné à 240 € par mois.",
      },
      {
        question: "Comment savoir si mon locataire sous-loue mon appartement ?",
        answer:
          "Recherchez une annonce présentant votre logement sur les plateformes de location, conservez son adresse, des captures datées et le calendrier de disponibilités. Le simple passage de plusieurs personnes ne suffit pas : le locataire peut héberger gratuitement des proches.",
      },
      {
        question: "Quelles sanctions en cas de sous-location illégale ?",
        answer:
          "Le juge peut prononcer la résiliation du bail, condamner le locataire à restituer les sous-loyers perçus et, si un préjudice est établi, à verser des dommages et intérêts. Ces conséquences ne sont pas automatiques et supposent des preuves.",
      },
      {
        question: "Le propriétaire peut-il récupérer les sommes perçues sur Airbnb ?",
        answer:
          "La Cour de cassation a jugé en 2019 que les sous-loyers tirés d'une sous-location non autorisée reviennent en principe au propriétaire. Leur restitution doit être demandée en justice, sur la base des preuves réunies.",
      },
    ];
  }

  if (slug === "nouveau-bail-location-2026") {
    return [
      {
        question: "Qu'est-ce qui change dans le bail de location au 1er octobre 2026 ?",
        answer:
          "Le décret du 6 juillet 2026 modifie les contrats types des locations de résidence principale : la clause résolutoire figure dans le modèle, une mention est prévue pour les logements soumis à une obligation de résidence principale et le numéro de téléphone portable des parties peut être indiqué, à titre facultatif.",
      },
      {
        question: "Faut-il refaire un bail signé avant le 1er octobre 2026 ?",
        answer:
          "Non. Les nouveaux contrats types s'appliquent aux baux conclus ou renouvelés à compter du 1er octobre 2026. Un bail en cours n'a pas à être réécrit uniquement parce que le modèle réglementaire a changé.",
      },
      {
        question: "La clause résolutoire est-elle obligatoire dans un bail ?",
        answer:
          "Oui, depuis la loi du 27 juillet 2023 : le bail doit prévoir sa résiliation de plein droit en cas de défaut de paiement du loyer, des charges ou du dépôt de garantie. Le nouveau contrat type l'intègre désormais.",
      },
      {
        question: "Que signifie le délai de 6 semaines du commandement de payer ?",
        answer:
          "La clause résolutoire ne joue qu'après un commandement de payer, délivré par un commissaire de justice et resté sans effet pendant six semaines. Ce délai ne permet pas de récupérer le logement : le juge peut accorder des délais, et l'expulsion suppose une décision de justice.",
      },
      {
        question: "Quelle notice d'information joindre au bail en 2026 ?",
        answer:
          "Pour les contrats conclus ou renouvelés depuis le 18 octobre 2026, la nouvelle notice issue de l'arrêté du 9 octobre 2026 doit être annexée au bail. Elle présente les droits et obligations des parties, le loyer, les garanties, les impayés et le règlement des litiges.",
      },
    ];
  }

  return [];
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug)
  const faqItems = getFaqForSlug(slug)
  const seoTitle = article.metaTitle || article.title
  const seoDescription = article.metaDescription || article.description
  const canonicalUrl = `https://www.bailnotarie.fr/blog/${article.slug}`

  // Préparer les données pour le schéma Article
  const articleForSchema = {
    title: seoTitle,
    description: seoDescription,
    content: article.content,
    slug: article.slug,
    publishedAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    image: article.imageUrl || article.ogImage,
    author: "Équipe BailNotarie",
    category: {
      name: article.category.name,
      slug: article.category.slug
    }
  };

  return (
    <>
      <ArticleSchema article={articleForSchema} />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: article.title },
        ]}
      />
      <FaqSchema items={faqItems} pageUrl={canonicalUrl} />
      {/* Sans réserve : la pastille flotte sur l'image de couverture. */}
      <LpNav overlay />
      <BlogPageClient article={article} faqItems={faqItems} />
      <Footer />
    </>
  )
}

