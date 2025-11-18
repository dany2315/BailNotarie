"use client";

import { useState, useEffect } from "react";
import { getComments, createComment } from "@/lib/actions/comments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface CommentThreadProps {
  target: "PARTY" | "PROPERTY" | "LEASE" | "DOCUMENT" | "INTAKE";
  targetId: string;
}

export function CommentThread({ target, targetId }: CommentThreadProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");

  useEffect(() => {
    loadComments();
  }, [target, targetId]);

  const loadComments = async () => {
    try {
      const data = await getComments(target, targetId);
      setComments(data);
    } catch (error) {
      toast.error("Erreur lors du chargement des commentaires");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    try {
      const newComment = await createComment({
        target,
        targetId,
        body: body.trim(),
      });
      setComments([...comments, newComment]);
      setBody("");
      toast.success("Commentaire ajouté");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout du commentaire");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commentaires ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun commentaire pour le moment
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b pb-3 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.createdBy.name || comment.createdBy.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!body.trim()}>
              <Send className="size-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}














