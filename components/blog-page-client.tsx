"use client";

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowUpDown, ArrowUpRight, Calendar, CheckCircle2, ChevronRight, Clock, FileText, PhoneCall, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ShareButtonSimple } from '@/components/share-button-simple';
import { CommentButton } from '@/components/comment-button';
import { CommentsSection, CommentsSectionRef } from '@/components/comments-section';
import { formatDate, calculateReadTime } from '@/lib/blog-utils';
import { Blog1Content, Blog2Content, Blog3Content, Blog4Content, Blog5Content, Blog6Content, Blog7Content, Blog8Content, Blog9Content, Blog10Content, Blog11Content, Blog12Content, Blog13Content, Blog14Content } from '@/components/blog-content';

type TocItem = {
  id: string;
  label: string;
};

type ArticleExperience = {
  quickAnswer: string;
  keyPoints: string[];
  toc: TocItem[];
  ctaLabel?: string;
  ctaDescription?: string;
};

const contentComponents: Record<string, React.ComponentType> = {
  'blog-1': Blog1Content,
  'blog-2': Blog2Content,
  'blog-3': Blog3Content,
  'blog-4': Blog4Content,
  'blog-5': Blog5Content,
  'blog-6': Blog6Content,
  'blog-7': Blog7Content,
  'blog-8': Blog8Content,
  'blog-9': Blog9Content,
  'blog-10': Blog10Content,
  'blog-11': Blog11Content,
  'blog-12': Blog12Content,
  'blog-13': Blog13Content,
  'blog-14': Blog14Content,
};

const articleExperiences: Record<string, ArticleExperience> = {
  'blog-1': {
    quickAnswer: "Le bail notarié est un acte authentique qui sécurise la location et renforce les recours en cas d'impayés.",
    keyPoints: [
      "Force exécutoire et meilleure sécurité juridique",
      "Contrat clair pour bailleur et locataire",
      "Solution adaptée aux bailleurs qui veulent sécuriser leurs loyers",
    ],
    toc: [
      { id: 'definition', label: 'Définition' },
      { id: 'avantages', label: 'Avantages' },
      { id: 'reforme-2025', label: 'Réforme 2025' },
      { id: 'protection', label: 'Protection des parties' },
    ],
    ctaLabel: 'Créer mon bail notarié',
    ctaDescription: "Préparez votre dossier en ligne puis transmettez-le à un notaire partenaire.",
  },
  'blog-2': {
    quickAnswer: "Établir un bail notarié suppose surtout de réunir un dossier complet, puis de passer par la vérification et la signature notariales.",
    keyPoints: [
      "Checklist des pièces à réunir",
      "Étapes claires de la constitution du dossier à la signature",
      "Réduction des retards grâce à un dossier complet dès le départ",
    ],
    toc: [
      { id: 'checklist-rapide', label: 'Checklist rapide' },
      { id: 'etape1', label: 'Constituer le dossier' },
      { id: 'etape5', label: 'Vérification par le notaire' },
      { id: 'etape6', label: 'Signature de l’acte' },
      { id: 'delais-reels', label: 'Délais réels' },
    ],
    ctaLabel: 'Commencer mon dossier',
    ctaDescription: "Gagnez du temps avec un parcours guidé et les bonnes pièces dès le départ.",
  },
  'blog-3': {
    quickAnswer: "La force exécutoire permet au bail notarié d'offrir un recouvrement beaucoup plus efficace qu'un bail sous seing privé.",
    keyPoints: [
      "Titre exécutoire attaché à l’acte authentique",
      "Recouvrement plus rapide en cas d’impayés",
      "L’expulsion reste toutefois soumise au juge",
    ],
    toc: [
      { id: 'definition', label: 'Définition' },
      { id: 'pourquoi', label: 'Pourquoi cela fonctionne' },
      { id: 'benefices-bailleur', label: 'Bénéfices concrets' },
      { id: 'limites', label: 'Limites' },
    ],
  },
  'blog-4': {
    quickAnswer: "Le bail notarié coûte plus cher au départ, mais il apporte un niveau de sécurité juridique et de recouvrement supérieur au bail classique.",
    keyPoints: [
      "Comparaison coût / sécurité / recours",
      "Article utile pour choisir selon votre profil de bailleur",
      "Décision plus simple grâce au tableau comparatif",
    ],
    toc: [],
  },
  'blog-5': {
    quickAnswer: "Le bail notarié doit respecter les obligations du droit locatif tout en ajoutant les garanties propres à l'acte authentique.",
    keyPoints: [
      "Mentions obligatoires du bail et diagnostics",
      "Formalités renforcées par l’authentification notariale",
      "Bon article pour éviter les clauses fragiles",
    ],
    toc: [
      { id: 'definition', label: 'Définition' },
      { id: 'obligations-communes', label: 'Obligations communes' },
      { id: 'obligations-notarie', label: 'Obligations renforcées' },
      { id: 'pour-qui', label: 'Pour qui ?' },
    ],
  },
  'blog-6': {
    quickAnswer: "Le coût d’un bail notarié d’habitation se situe souvent autour d’une base proche d’un demi-loyer hors charges, avec TVA et formalités.",
    keyPoints: [
      "Réponses claires sur le prix, les frais et le partage",
      "Exemples concrets selon le loyer mensuel",
    ],
    toc: [
      { id: 'reponse-rapide', label: 'Réponse rapide' },
      { id: 'tarif-reglemente', label: 'Tarif réglementé' },
      { id: 'exemple-chiffre', label: 'Exemple chiffré' },
      { id: 'repartition-frais', label: 'Qui paie ?' },
      { id: 'a-retenir', label: 'À retenir' },
    ],
    ctaLabel: 'Estimer mon dossier',
    ctaDescription: "Obtenez un cadrage simple sur le coût et les pièces à fournir pour votre bail.",
  },
  'blog-7': {
    quickAnswer: "La procuration notariale permet de signer un bail notarié à distance sans perdre la sécurité de l'acte authentique.",
    keyPoints: [
      "Solution utile pour expatriés et signataires éloignés",
      "Maintien de la sécurité notariale",
      "Parcours plus fluide qu’un rendez-vous physique unique",
    ],
    toc: [
      { id: 'definition', label: 'Définition' },
      { id: 'cas-usage', label: 'Cas d’usage' },
      { id: 'cout', label: 'Coût' },
      { id: 'notre-service', label: 'Notre service' },
      { id: 'a-retenir', label: 'À retenir' },
    ],
  },
  'blog-8': {
    quickAnswer: "Depuis la réforme 2025, le bail notarié renforce encore la capacité de recouvrement rapide des loyers impayés, notamment via la saisie sur salaire.",
    keyPoints: [
      "Sujet fort pour bailleurs sensibles au risque d’impayé",
      "Angle juridique différenciant",
    ],
    toc: [
      { id: 'titre-executoire', label: 'Titre exécutoire' },
      { id: 'processus', label: 'Processus' },
      { id: 'quotite', label: 'Quotité saisissable' },
      { id: 'conclusion', label: 'Conclusion' },
    ],
  },
  'blog-9': {
    quickAnswer: "Les diagnostics immobiliers influencent directement la validité du dossier locatif et la sécurité juridique du bail.",
    keyPoints: [
      "Validité illimitée, temporaire ou volatile selon le diagnostic (DPE, électricité, gaz, amiante, plomb, ERP)",
      "Un diagnostic périmé peut annuler votre bail ou bloquer votre vente",
      "Risques juridiques : annulation, responsabilité pénale, sanction indécence (logements G interdits à la location)",
    ],
    toc: [
      { id: 'illimites', label: 'Validité illimitée' },
      { id: 'temporaires', label: 'Validité temporaire' },
      { id: 'volatiles', label: 'Validité conditionnelle' },
      { id: 'tableau', label: 'Tableau récapitulatif' },
      { id: 'risques', label: 'Risques juridiques' },
    ],
  },
  'blog-10': {
    quickAnswer: "Le bail notarié n’évite pas l’intervention du juge pour expulser, mais il donne un avantage décisif pour le recouvrement des sommes dues.",
    keyPoints: [
      "Clarifie un sujet juridique souvent mal compris",
      "Met en avant le titre exécutoire et la réaction rapide",
    ],
    toc: [
      { id: 'expulsion', label: 'Expulsion' },
      { id: 'titre-executoire', label: 'Titre exécutoire' },
      { id: 'securisation', label: 'Sécurisation financière' },
      { id: 'conclusion', label: 'Conclusion' },
    ],
  },
  'blog-11': {
    quickAnswer: "Le bail authentique est un bail notarié : un bail de location signé devant notaire, sous forme d’acte authentique, avec une protection juridique renforcée.",
    keyPoints: [
      "Définition, prix, procédure et différences avec un bail classique",
    ],
    toc: [
      { id: 'reponse-rapide-bail-authentique', label: 'Réponse rapide' },
      { id: 'avantages-bail-authentique', label: 'Avantages' },
      { id: 'prix-bail-authentique', label: 'Prix' },
      { id: 'procedure-bail-authentique', label: 'Procédure' },
      { id: 'difference-bail-authentique-classique', label: 'Différences' },
    ],
    ctaLabel: 'Commencer mon dossier',
    ctaDescription: "Accédez à l’acte authentique avec un parcours plus simple et un dossier préparé en ligne.",
  },
  'blog-12': {
    quickAnswer: "BailNotarie est une plateforme digitale qui prépare, structure et transmet les dossiers de bail notarié à des notaires partenaires.",
    keyPoints: [
      "Clarifie le positionnement du service",
    ],
    toc: [
      { id: 'positionnement-bailnotarie', label: 'Positionnement' },
      { id: 'ce-que-bailnotarie-fait', label: 'Ce que fait la plateforme' },
      { id: 'pourquoi-confier', label: 'Pourquoi nous confier vos dossiers' },
      { id: 'a-qui-sadresse', label: 'À qui cela s’adresse' },
    ],
  },
  'blog-13': {
    quickAnswer: "Le bail commercial notarié sécurise davantage un bail 3/6/9 grâce à l’acte authentique, à la date certaine et à un meilleur cadre de recouvrement.",
    keyPoints: [
      "Explique le rôle du notaire, le coût et les obligations",
      "Très adapté aux bailleurs et exploitants professionnels",
    ],
    toc: [
      { id: 'reponse-rapide-bail-commercial', label: 'Réponse rapide' },
      { id: 'acte-authentique-securite', label: 'Acte authentique' },
      { id: 'enregistrement-bail-commercial', label: 'Enregistrement' },
      { id: 'notaire-obligatoire-bail-commercial', label: 'Notaire obligatoire ?' },
      { id: 'cout-bail-commercial-notarie', label: 'Coût' },
    ],
    ctaLabel: 'Être accompagné',
    ctaDescription: "Préparez un dossier plus propre avant transmission au notaire ou à votre conseil.",
  },
  'blog-14': {
    quickAnswer: "Le bail dérogatoire permet de louer un local commercial hors statut des baux commerciaux, dans une limite stricte de 36 mois et avec un risque réel de requalification.",
    keyPoints: [
      "Sujet juridique précis à forte valeur longue traîne",
      "Durée maximale, requalification et article L.145-5",
      "Très utile pour sécuriser un bail de courte durée",
    ],
    toc: [
      { id: 'reponse-rapide-bail-derogatoire', label: 'Réponse rapide' },
      { id: 'definition-juridique', label: 'Définition juridique' },
      { id: 'conditions-validite', label: 'Conditions de validité' },
      { id: 'risque-requalification', label: 'Requalification' },
      { id: 'conseils-pratiques-bail-derogatoire', label: 'Conseils pratiques' },
    ],
    ctaLabel: 'Parler de mon dossier',
    ctaDescription: "Sécurisez la rédaction et les échéances clés avant de signer votre contrat.",
  },
};

function getArticleExperience(article: any): ArticleExperience {
  return articleExperiences[article.id] || {
    quickAnswer: article.description,
    keyPoints: [
      "Réponse claire, pratique et à jour",
      "Lecture pensée pour aller à l’essentiel rapidement",
      "Lien direct vers la constitution de votre dossier si besoin",
    ],
    toc: [],
    ctaLabel: 'Créer mon bail notarié',
    ctaDescription: "Préparez votre dossier en ligne et avancez plus vite vers la signature.",
  };
}

interface BlogPageClientProps {
  article: any;
  relatedArticles: any[];
  faqItems?: Array<{ question: string; answer: string }>;
}

export function BlogPageClient({ article, relatedArticles, faqItems = [] }: BlogPageClientProps) {
  const commentsSectionRef = useRef<CommentsSectionRef>(null);
  const readTime = (article as any).readTime || calculateReadTime(article.content || article.description || '');
  const displayTitle = article.metaTitle || article.title;
  const hasDifferentEditorialTitle = Boolean(article.metaTitle && article.metaTitle !== article.title);
  const articleExperience = getArticleExperience(article);
  const shareUrl = `${process.env.NEXT_PUBLIC_URL || 'https://www.bailnotarie.fr'}/blog/${article.slug}`;

  const handleCommentClick = () => {
    commentsSectionRef.current?.openModal();
  };

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${targetId}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-28 lg:pb-0">
      <section className="relative min-h-[39vh] md:min-h-[40vh] overflow-hidden">
        <Image
          src={article.imageUrl || "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200"}
          alt={article.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/50 to-black/25" />
        <div className="absolute inset-0 flex items-end pt-21">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 md:pb-25 w-full">
          
            <div className="max-w-6xl space-y-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {article.category.name}
              </Badge>

              <h1 className="text-2xl md:text-5xl font-bold text-white leading-tight text-balance">
                {displayTitle}
              </h1>
              {hasDifferentEditorialTitle && (
                <p className="text-white/85 text-base md:text-lg">
                  {article.title}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Équipe BailNotarie</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(article.createdAt)}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-10 md:-mt-14 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border shadow-lg p-5 md:p-8">
            <div className="flex flex-col gap-4">
              <div>
                <Link
                  href="/blog"
                  className="inline-flex items-center text-blue-700 hover:text-blue-800 transition-colors mb-2"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour au blog
                </Link>
                <div className="flex justify-between w-full items-center gap-2">
                  <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-4">
                    Réponse rapide
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 mb-4">
                    <ShareButtonSimple
                      url={shareUrl}
                      title={article.title}
                      description={article.description}
                      variant="outline"
                      onlyIcon={true}
                      size="sm"
                      className=" text-blue-700 border-white/50 rounded-xl"
                    />
                    <CommentButton
                      variant="outline"
                      size="sm"
                      className=" text-blue-700 border-white/50  rounded-xl"
                      onCommentClick={handleCommentClick}
                      onlyIcon={true}
                    />
                 </div>
                </div>
                
                <p className="text-base md:text-lg text-gray-800 leading-relaxed">
                  {articleExperience.quickAnswer}
                </p>
              </div>

            </div>

            {articleExperience.toc.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Dans cet article
                </div>
                <div className="flex flex-wrap gap-2">
                  {articleExperience.toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => handleTocClick(e, item.id)}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors"
                    >
                      {item.label}

                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                  ))}
                    <a
                      href={faqItems.length > 0 ? '#faq-visible' : '#comments-section'}
                      onClick={(e) => handleTocClick(e, faqItems.length > 0 ? 'faq-visible' : 'comments-section')}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors"
                    >
                      {faqItems.length > 0 ? 'Voir la FAQ' : 'Poser une question'}
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>

                </div>
              </div>
            )}

               {articleExperience.keyPoints.length > 0 && (
                  <div className="hidden sm:grid sm:grid-cols-3 pt-5 border-t border-gray-100 gap-3 mt-6">
                    {articleExperience.keyPoints.map((point) => (
                      <div key={point} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-700">{point}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>
        </div>
      </section>

      <section className="pb-16 pt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 blog-content-anchors">
              <article className="prose prose-lg max-w-none prose-h2:text-gray-900 prose-h3:text-gray-900">
                <div className="bg-white rounded-2xl border shadow-sm pt-5 pb-8 px-5 sm:px-8">
                  {(() => {
                    const articleId = article.id;
                    const ContentComponent = contentComponents[articleId];

                    if (ContentComponent) {
                      const Component = ContentComponent;
                      return <Component />;
                    }

                    return <div dangerouslySetInnerHTML={{ __html: article.content || '' }} />;
                  })()}

                  {faqItems.length > 0 && (
                    <section aria-labelledby="faq-visible" className="mt-12">
                      <h2 id="faq-visible" className="text-2xl font-bold text-gray-900 mb-6">
                        Questions fréquentes
                      </h2>
                      <div className="space-y-4">
                        {faqItems.map((faq, index) => (
                          <div key={`${faq.question}-${index}`} className="border border-gray-200 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                            <p className="text-gray-700">{faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </article>

              <div className="mt-8 rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 p-6">
                <div className="flex flex-col  md:justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 mb-2">Besoin d'aide pour passer à l'acte ?</p>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Constituez votre dossier de bail notarié plus simplement
                    </h3>
                    <p className="text-sm text-gray-700">
                      Un parcours plus clair, des pièces mieux préparées et une transmission plus fluide vers le notaire.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> France entière</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> 100% en ligne</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> Notaires partenaires</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> Acte authentique</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:self-end">
                    <a
                      href="tel:0749387756"
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      <PhoneCall className="mr-2 h-4 w-4" />
                      Appeler maintenant
                    </a>
                    <Link
                      href="/commencer"
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      {articleExperience.ctaLabel || 'Créer mon bail notarié'}
                    </Link>
                  </div>
                </div>
              </div>

              <div id="comments-section" className="sm:mt-12 mt-0">
                <CommentsSection
                  ref={commentsSectionRef}
                  articleId={article.id}
                  comments={article.comments}
                />
              </div>

              {relatedArticles.length > 0 && (
                <Card className="p-6 mt-12 rounded-2xl">
                  <h3 className="font-semibold mb-4 text-gray-900">Articles liés</h3>
                  <div className="space-y-4">
                    {relatedArticles.map((relatedArticle: { id: string; slug: string; title: string; createdAt: Date; imageUrl: string }) => (
                      <Link
                        key={relatedArticle.id}
                        href={`/blog/${relatedArticle.slug}`}
                        className="block group rounded-xl p-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex gap-3">
                          <Image
                            src={relatedArticle.imageUrl || "https://images.pexels.com/photos/4427430/pexels-photo-4427430.jpeg?auto=compress&cs=tinysrgb&w=100"}
                            alt={relatedArticle.title}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                          <div>
                            <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors line-clamp-2 text-gray-900">
                              {relatedArticle.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(relatedArticle.createdAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="hidden lg:block bg-white rounded-2xl shadow-sm border p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">
                  Action rapide
                </p>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Préparer votre bail notarié
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Transformez votre lecture en dossier concret, prêt à avancer vers la signature.
                </p>
                <div className="space-y-2">
                  <Link
                    href="/commencer"
                    className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    {articleExperience.ctaLabel || 'Créer mon bail notarié'}
                  </Link>
                  <a
                    href="tel:0749387756"
                    className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Appeler
                  </a>
                </div>
              </div>

              {articleExperience.toc.length > 0 && (
                <div className="hidden lg:block bg-white rounded-2xl shadow-sm border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Dans cet article</h3>
                  <div className="space-y-2">
                    {articleExperience.toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => handleTocClick(e, item.id)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    ))}
                     <a
                      href={faqItems.length > 0 ? '#faq-visible' : '#comments-section'}
                      onClick={(e) => handleTocClick(e, faqItems.length > 0 ? 'faq-visible' : 'comments-section')}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors"
                    >
                      {faqItems.length > 0 ? 'Voir la FAQ' : 'Poser une question'}
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              <div className="hidden lg:block bg-white rounded-2xl shadow-sm border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">À retenir</h3>
                <div className="space-y-3">
                  {articleExperience.keyPoints.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden lg:block bg-white rounded-2xl shadow-sm border p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Partager l'article</h3>
                <div className="space-y-2">
                  <ShareButtonSimple
                    url={shareUrl}
                    title={article.title}
                    description={article.description}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-black"
                  />
                  <CommentButton
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onCommentClick={handleCommentClick}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lg:hidden fixed inset-x-4 bottom-4 z-40">
        <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-xl p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 overflow-hidden">
              <p className="text-xs font-semibold text-blue-700">Besoin d'aller plus loin ?</p>
              <p className="text-sm text-gray-700 whitespace-nowrap">
                <span className="inline-block animate-marquee">
                  Préparez votre dossier de bail notarié en ligne.
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="tel:0749387756"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800"
                aria-label="Appeler maintenant"
              >
                <PhoneCall className="h-4 w-4" />
              </a>
              <Link
                href="/commencer"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Commencer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
