"use client";

import { useEffect, useState } from "react";
import type { CommentTarget } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { getComments, markAllCommentsAsReadForTarget } from "@/lib/actions/comments";
import { CommentItem } from "@/components/comments/comment-item";
import { CommentForm } from "@/components/comments/comment-form";

/**
 * Notes internes affichées dans la fiche (mêmes commentaires que le tiroir
 * « Commentaires ») : visibles par l'équipe uniquement, marquées comme lues à
 * l'affichage.
 */
export function InternalNotes({ target, targetId }: { target: CommentTarget; targetId: string }) {
  const [comments, setComments] = useState<any[] | null>(null);

  const load = async () => {
    try {
      setComments(await getComments(target, targetId));
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    load();
    markAllCommentsAsReadForTarget(target, targetId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, targetId]);

  return (
    <div className="flex flex-col gap-3">
      {comments === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note pour l&apos;instant.</p>
      ) : (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-muted/50 px-3 py-2">
              <CommentItem comment={comment} />
            </div>
          ))}
        </div>
      )}
      <CommentForm target={target} targetId={targetId} onCommentAdded={load} />
    </div>
  );
}
