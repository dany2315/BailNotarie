"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface ShareButtonSimpleProps {
  url: string;
  title: string;
  description: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
  //que icon
  onlyIcon?: boolean;
}

export function ShareButtonSimple({ 
  url, 
  title, 
  description, 
  variant = "outline", 
  size = "sm",
  className = "",
  onlyIcon = false
}: ShareButtonSimpleProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        });
      } catch (error) {
        console.log('Erreur lors du partage:', error);
      }
    } else {
      // Fallback pour copier le lien
      try {
        await navigator.clipboard.writeText(url);
        alert('Lien copié dans le presse-papiers !');
      } catch (error) {
        console.log('Erreur lors de la copie:', error);
      }
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={handleShare}
    >
      {onlyIcon ? <Share2 className="h-4 w-4" /> : 
      <>
      <Share2 className="h-4 w-4 mr-2" />
      <span className="sm:inline">Partager</span>
      </>
      }
    </Button>
  );
}
