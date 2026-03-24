import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { blogData, blogCategories } from '@/lib/blog-data'
import { generateArticleMetadata } from '@/lib/blog-utils'
import { BlogPageClient } from '@/components/blog-page-client'
import { ArticleSchema } from '@/components/seo/article-schema'
import { FaqSchema } from '@/components/seo/faq-schema'
import { prisma } from '@/lib/prisma'

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
    updatedAt: article.createdAt
  } as any;

  return generateArticleMetadata(articleForMetadata);
}

// Fonction pour récupérer l'article
async function getArticle(slug: string) {
  const article = blogData.find(a => a.slug === slug);
  
  if (!article) {
    notFound()
  }
  
  const category = blogCategories.find(cat => cat.id === article.categoryId) || blogCategories[0];
  
  // Charger les commentaires côté serveur pour un affichage immédiat
  const comments = await prisma.comment.findMany({
    where: {
      articleId: article.id,
      isApproved: true, // Seulement les commentaires approuvés
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return {
    ...article,
    category,
    comments: comments.map(comment => ({
      id: comment.id,
      name: comment.name,
      email: comment.email,
      content: comment.content,
      createdAt: comment.createdAt,
      isApproved: comment.isApproved,
    })),
    updatedAt: article.createdAt
  }
}

// Fonction pour récupérer les articles liés
function getRelatedArticles(categoryId: string, currentSlug: string) {
  return blogData
    .filter(article => article.categoryId === categoryId && article.slug !== currentSlug)
    .slice(0, 3)
    .map(article => ({
      ...article,
      category: blogCategories.find(cat => cat.id === article.categoryId) || blogCategories[0]
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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
          "La durée minimale d'un bail commercial est de 9 ans. C'est la règle des 3-6-9 : le locataire peut donner congé à l'expiration de chaque période triennale (3 ans, 6 ans ou 9 ans) avec un préavis de 6 mois. Le bailleur ne peut pas mettre fin au bail avant les 9 ans, sauf exceptions strictement limitées par la loi.",
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

  return [];
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug)
  const relatedArticles = getRelatedArticles(article.categoryId, article.slug)
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
      <FaqSchema items={faqItems} pageUrl={canonicalUrl} />
      <Header />
      <BlogPageClient article={article} relatedArticles={relatedArticles} faqItems={faqItems} />
      <Footer />
    </>
  )
}

