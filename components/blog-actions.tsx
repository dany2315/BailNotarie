"use client";

import { useRef } from 'react';
import { ShareButtonSimple } from '@/components/share-button-simple';
import { CommentButton } from '@/components/comment-button';
import { CommentsSection, CommentsSectionRef } from '@/components/comments-section';
import { ShareButtons } from '@/components/share-buttons';

interface BlogActionsProps {
  slug: string;
  title: string;
  description: string;
  variant?: 'hero' | 'sidebar';
  onCommentClick?: () => void;
}

export function BlogActions({ slug, title, description, variant = 'hero', onCommentClick }: BlogActionsProps) {

  if (variant === 'hero') {
    return (
      <>
        {/* Boutons dans la section hero */}
        <div className="flex items-center space-x-4">
          <ShareButtonSimple 
            url={`${process.env.NEXT_PUBLIC_URL}/blog/${slug}`}
            title={title}
            description={description}
            variant="outline"
            size="sm"
            className="bg-transparent text-white"
          />
          <CommentButton 
            variant="outline"
            size="sm"
            className="bg-transparent text-white"
            onCommentClick={onCommentClick}
          />
        </div>
      </>
    );
  }

  // Variant sidebar
  return (
    <>
      {/* Boutons dans la sidebar */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Partager l'article</h3>
        <ShareButtons
          url={`${process.env.NEXT_PUBLIC_URL}/blog/${slug}`}
          title={title}
          description={description}
        />
        <div className="mt-4">
          <CommentButton 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onCommentClick={onCommentClick}
          />
        </div>
      </div>
    </>
  );
}
