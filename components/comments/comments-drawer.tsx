"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { getComments, getUnreadCommentsCount, markAllCommentsAsReadForTarget } from "@/lib/actions/comments";
import { CommentTarget } from "@prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface CommentsDrawerProps {
  target: CommentTarget;
  targetId: string;
  trigger?: React.ReactNode;
}

export function CommentsDrawer({ target, targetId, trigger }: CommentsDrawerProps) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getComments(target, targetId);
      setComments(data);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCommentsCount(target, targetId);
      // S'assurer que le compteur est un nombre valide
      setUnreadCount(count && count > 0 ? count : 0);
    } catch (error) {
      console.error("Error loading unread count:", error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    // Recharger le compteur toutes les 30 secondes
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [target, targetId]);

  useEffect(() => {
    if (open) {
      loadComments();
      // Marquer tous les commentaires comme lus quand on ouvre le drawer
      markAllCommentsAsReadForTarget(target, targetId).then(() => {
        setUnreadCount(0);
        // Recharger le compteur pour s'assurer qu'il est à jour
        loadUnreadCount();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCommentAdded = () => {
    loadComments();
    // Recharger le compteur après avoir ajouté un commentaire
    loadUnreadCount();
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <MessageSquare className="size-4" />
      Commentaires
      {unreadCount > 0 ? (
        <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {unreadCount}
        </span>
      ) : null}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Commentaires
          </SheetTitle>
          <SheetDescription>
            {comments.length === 0
              ? "Aucun commentaire pour le moment"
              : `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="size-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Aucun commentaire pour le moment.
                  <br />
                  Soyez le premier à commenter !
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {comments.map((comment, index) => (
                  <div key={comment.id}>
                    <CommentItem comment={comment} />
                    {index < comments.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4 bg-background">
          <CommentForm
            target={target}
            targetId={targetId}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

