"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface CommentButtonProps {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  onCommentClick?: () => void;
}

export function CommentButton({ 
  variant = "outline", 
  size = "sm",
  className = "",
  onCommentClick
}: CommentButtonProps) {
  const handleClick = () => {
    if (onCommentClick) {
      // Si onCommentClick est fourni, on l'utilise pour ouvrir le modal
      onCommentClick();
    } else {
      // Fallback : scroll vers la section commentaires
      const commentsSection = document.getElementById('comments-section');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleClick}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Commenter
    </Button>
  );
}
