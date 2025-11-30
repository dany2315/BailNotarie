"use client";

import * as React from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface CardFlipProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  badgeClass?: string;
  number: number;
  bgGradient?: string;
  handleStart: () => void;
}

export function CardFlip({
  title,
  subtitle,
  description,
  features,
  icon: Icon,
  iconBg = "bg-blue-100",
  iconColor = "text-blue-600",
  badgeClass = "bg-blue-600",
  number,
  bgGradient ,
  handleStart,
}: CardFlipProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Intersection Observer pour détecter la visibilité sur mobile
  React.useEffect(() => {
    if (!isMobile) return;
    
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.intersectionRatio >= 0.8);
      },
      {
        threshold: 0.8, // ✅ 3/4 visibles avant activation
      }
    );

    observer.observe(cardElement);

    return () => {
      observer.unobserve(cardElement);
    };
  }, [isMobile]);

  // Logique de flip : sur mobile basée sur la visibilité, sur desktop basée sur le hover
  React.useEffect(() => {
    if (isMobile) {
      setIsFlipped(isVisible);
    } else {
      setIsFlipped(isHovered);
    }
  }, [isMobile, isVisible, isHovered]);

  return (
    <div 
      ref={cardRef}
      className="perspective-2000 h-[520px] sm:h-[520px] w-full "
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <div 
        className="relative h-full w-full preserve-3d transition-transform duration-1000 sm:duration-700 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of card */}
        <div className="absolute inset-0 backface-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 p-8 shadow-lg">
          <div className="relative flex h-full flex-col items-center justify-center text-center">
            <div 
              className={cn("mb-6 flex h-24 w-24 items-center justify-center rounded-2xl shadow-md transition-transform duration-300", iconBg)}
              style={{
                transform: isFlipped ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Icon className={cn("h-12 w-12", iconColor)} />
            </div>
            <div className={cn("mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-semibold text-white", badgeClass)}>
              Étape {number}
            </div>
            <h3 className="mb-3 text-2xl font-bold text-gray-900">
              {title}
            </h3>
            <p className="text-lg text-gray-600">
              {subtitle}
            </p>
            <div className={`absolute bottom-0 right-0 bg-accent p-2 rounded-4xl ${iconBg}`}>
                <ArrowRight className=" h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div 
          className={`absolute inset-0 backface-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br ${bgGradient} p-8 shadow-xl`}
          style={{
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex h-full flex-col">
            <div className="mb-0">
              <div className={cn("mb-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold text-white", badgeClass)}>
                Étape {number}
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                {title}
              </h3>
              <p className="mb-6 text-gray-700 leading-relaxed">
                {description}
              </p>
            </div>
            <div className="mt-auto space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Détails
              </h4>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-700"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleStart()}
                className={`w-full  justify-center items-center text-white text-lg px-8 py-4 h-auto rounded-xl shadow-md transition-all duration-200 ${badgeClass} text-white`}
              >
                  Commencer maintenant

                <ArrowRight className=" h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

