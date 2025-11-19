"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils/formatters";

interface CommentItemProps {
  comment: {
    id: string;
    body: string;
    createdAt: Date | string;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };
}

export function CommentItem({ comment }: CommentItemProps) {
  const userInitials = comment.createdBy.name
    ? comment.createdBy.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : comment.createdBy.email[0].toUpperCase();

  const displayName = comment.createdBy.name || comment.createdBy.email;

  return (
    <div className="group flex gap-3 py-4 px-1">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={comment.createdBy.image || undefined} alt={displayName} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(comment.createdAt)}
          </span>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {comment.body}
          </p>
        </div>
      </div>
    </div>
  );
}

