"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { createComment } from "@/lib/actions/comments";
import { CommentTarget } from "@prisma/client";
import { toast } from "sonner";

interface CommentFormProps {
  target: CommentTarget;
  targetId: string;
  onCommentAdded?: () => void;
}

export function CommentForm({ target, targetId, onCommentAdded }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!body.trim()) {
      toast.error("Le commentaire ne peut pas être vide");
      return;
    }

    startTransition(async () => {
      try {
        await createComment({
          target,
          targetId,
          body: body.trim(),
        });
        
        setBody("");
        toast.success("Commentaire ajouté");
        onCommentAdded?.();
      } catch (error) {
        console.error("Error creating comment:", error);
        toast.error(error instanceof Error ? error.message : "Erreur lors de l'ajout du commentaire");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Ajouter un commentaire..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="resize-none"
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Appuyez sur Cmd/Ctrl + Entrée pour envoyer
          </p>
          <Button type="submit" size="sm" disabled={!body.trim() || isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="size-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}





