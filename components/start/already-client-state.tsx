"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlreadyClientStateProps {
  message: string;
  redirectTo?: string;
  redirectLabel?: string;
  onBack?: () => void;
}

export function AlreadyClientState({ 
  message, 
  redirectTo,
  redirectLabel ,
  onBack 
}: AlreadyClientStateProps) {
  const router = useRouter();

  const handleRedirect = () => {
    if (redirectTo) {
      router.push(redirectTo);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl font-bold">
          Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Empty className="border-0 p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </EmptyMedia>
            <EmptyTitle>{message}</EmptyTitle>
            <EmptyDescription>
              Vous pouvez suivre l'état de votre demande en cliquant sur le bouton ci-dessous.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {onBack && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="w-full sm:w-auto"
                >
                  Retour
                </Button>
              )}
              <Button
                type="button"
                size="lg"
                onClick={handleRedirect}
                className="w-full sm:flex-1"
              >
                {redirectLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}


