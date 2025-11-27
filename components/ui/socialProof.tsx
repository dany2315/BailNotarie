"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FcGoogle } from "react-icons/fc";
import useIsMobile from "@/hooks/useIsMobile";
export function SocialProof() {

    const isMobile = useIsMobile();
  return (
    <div className="inline-flex items-center gap-3 rounded-full border   px-4 py-2 shadow-2xl backdrop-blur-3xl bg-white/50">
      {/* Bloc Google + note */}
      <div className="flex items-center gap-2 border-r pr-3">
        <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold shadow-sm">
        <FcGoogle className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
          <span className="font-semibold text-foreground">4,9/5</span>
        </div>
      </div>

      {/* Avatars + texte social proof */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarImage src="https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face" alt="Client satisfait" />
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarImage src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face" alt="Client satisfait" />
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarImage src="https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face" alt="Client satisfait" />
            <AvatarFallback>EF</AvatarFallback>
          </Avatar>
        </div>

        <p className="text-xs leading-tight text-muted-foreground">
          <span className="font-semibold text-foreground">
            + de 200 clients satisfaits
          </span>{" "}
          {!isMobile ? "font déjà confiance à BailNotarie." :""}
        </p>
      </div>
    </div>
  );
}
