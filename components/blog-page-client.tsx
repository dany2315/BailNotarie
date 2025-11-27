"use client";

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ShareButtonSimple } from '@/components/share-button-simple';
import { CommentButton } from '@/components/comment-button';
import { CommentsSection, CommentsSectionRef } from '@/components/comments-section';
import { CallButton, ContactButton } from '@/components/ui/action-buttons';
import { formatDate, calculateReadTime } from '@/lib/blog-utils';
import { Blog1Content, Blog2Content, Blog3Content, Blog4Content, Blog5Content } from '@/components/blog-content';

// Mapping des composants de contenu par ID d'article
const contentComponents: Record<string, React.ComponentType> = {
  'blog-1': Blog1Content,
  'blog-2': Blog2Content,
  'blog-3': Blog3Content,
  'blog-4': Blog4Content,
  'blog-5': Blog5Content,
};
import useIsMobile from '@/hooks/useIsMobile';

interface BlogPageClientProps {
  article: any;
  relatedArticles: any[];
}

export function BlogPageClient({ article, relatedArticles }: BlogPageClientProps) {
  const commentsSectionRef = useRef<CommentsSectionRef>(null);
  // Utiliser readTime de l'article si disponible, sinon calculer depuis content ou description
  const readTime = (article as any).readTime || calculateReadTime(article.content || article.description || '');
  const isMobile = useIsMobile();
  const handleCommentClick = () => {
    commentsSectionRef.current?.openModal();
  };

  console.log(relatedArticles);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section avec image */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <Image
          src={article.imageUrl || "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200"}
          alt={article.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
        
        {/* Contenu superposé */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
            <Link 
              href="/blog"
              className="inline-flex items-center text-white/80 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Link>
            
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {article.category.name}
              </Badge>
              
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                {article.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Équipe BailNotarie</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(article.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{readTime} min de lecture</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <ShareButtonSimple 
                  url={`https://${process.env.NEXT_PUBLIC_URL}/blog/${article.slug}`}
                  title={article.title}
                  description={article.description}
                  variant="outline"
                  size="sm"
                  className="bg-transparent text-white"
                />
                <CommentButton 
                  variant="outline"
                  size="sm"
                  className="bg-transparent text-white"
                  onCommentClick={handleCommentClick}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenu principal */}
      <section className="pb-16 pt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenu de l'article */}
            <div className="lg:col-span-2">
              <article className="prose prose-lg max-w-none">
                <div className="bg-white rounded-lg shadow-sm pt-4 pb-8 px-6">
                  {(() => {
                    // Récupérer le composant depuis le mapping côté client
                    const articleId = article.id;
                    const ContentComponent = contentComponents[articleId];
                    
                    // Debug
                    if (typeof window !== 'undefined') {
                      console.log('🔍 Debug rendu contenu:', { 
                        articleId, 
                        hasComponent: !!ContentComponent,
                        availableIds: Object.keys(contentComponents),
                        componentType: ContentComponent ? typeof ContentComponent : 'undefined',
                        article: article
                      });
                    }
                    
                    if (ContentComponent) {
                      // Rendre le composant React
                      const Component = ContentComponent;
                      return <Component />;
                    }
                    
                    // Fallback vers HTML si pas de composant
                    if (typeof window !== 'undefined') {
                      console.warn('⚠️ Aucun composant trouvé pour article.id:', articleId);
                    }
                    return <div dangerouslySetInnerHTML={{ __html: article.content || '' }} />;
                  })()}
                </div>
              </article>
              
              {/* Actions */}
              <div className="mt-12 pt-8 border-t border-gray-200 px-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{article.category.name}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShareButtonSimple 
                      url={`https://${process.env.NEXT_PUBLIC_URL}/blog/${article.slug}`}
                      title={article.title}
                      description={article.description}
                      variant="outline"
                      size="sm"
                      className="bg-transparent text-black"
                      
                    />
                    <CommentButton 
                      variant="outline"
                      size="sm"
                      className="bg-transparent text-black"
                      onCommentClick={handleCommentClick}
                    />
                  </div>
                </div>
              </div>

              {/* CTA Mobile */}
              { isMobile && <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mt-10 ">
                <h3 className="font-bold text-gray-900 mb-3">
                  Besoin d'aide ?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Nos experts vous accompagnent dans votre projet de bail notarié.
                </p>
                <div className="space-y-2 ">
                  <CallButton />
                  <ContactButton />
                </div>
              </div>}

              {/* Section commentaires */}
              <div id="comments-section" className="sm:mt-12 mt-0">
                <CommentsSection 
                  ref={commentsSectionRef}
                  articleId={article.id}
                  comments={article.comments}
                />
              </div>

              {/* Articles liés */}
              {relatedArticles.length > 0 && (
                <Card className="p-6 mt-12">
                  <h3 className="font-semibold mb-4">Articles liés</h3>
                  <div className="space-y-4">
                    {relatedArticles.map((relatedArticle: { id: string; slug: string; title: string; createdAt: Date , imageUrl: string }) => (
                      <Link 
                        key={relatedArticle.id}
                        href={`/blog/${relatedArticle.slug}`}
                        className="block group"
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
                            <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
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
            
            {/* Sidebar */}
            <div className="space-y-8">
              {/* Barre de partage desktop */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Partager l'article</h3>
                <div className="space-y-2">
                  <ShareButtonSimple 
                    url={`https://${process.env.NEXT_PUBLIC_URL}/blog/${article.slug}`}
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

              {/* CTA */}
              { !isMobile && <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 ">
                <h3 className="font-bold text-gray-900 mb-3">
                  Besoin d'aide ?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Nos experts vous accompagnent dans votre projet de bail notarié.
                </p>
                <div className="space-y-2 ">
                  <CallButton />
                  <ContactButton />
                </div>
              </div>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
