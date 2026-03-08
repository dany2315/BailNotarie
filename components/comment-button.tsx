"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface CommentButtonProps {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  onCommentClick?: () => void;
  onlyIcon?: boolean;
}

export function CommentButton({ 
  variant = "outline", 
  size = "sm",
  className = "",
  onCommentClick,
  onlyIcon = false
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
      {onlyIcon ? <MessageCircle className="h-4 w-4 " /> : 
      <>
      <MessageCircle className="h-4 w-4 mr-2" />
      <span className="sm:inline">Commenter</span>
      </>
      }
    </Button>
  );
}
