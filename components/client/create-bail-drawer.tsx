"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { CreateBailForm, CreateBailFormRef } from "./create-bail-form";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { FileText } from "lucide-react";

interface CreateBailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biens: Array<{
    id: string;
    label: string | null;
    fullAddress: string | null;
  }>;
  locataires: Array<{
    id: string;
    persons: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise: {
      legalName: string;
      name: string;
    } | null;
  }>;
  ownerId: string;
  initialPropertyId?: string;
  onBailCreated?: (bail: any) => void;
}

export function CreateBailDrawer({
  open,
  onOpenChange,
  biens,
  locataires,
  ownerId,
  initialPropertyId,
  onBailCreated,
}: CreateBailDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const formRef = useRef<CreateBailFormRef | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onBailCreatedRef = useRef(onBailCreated);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onBailCreatedRef.current = onBailCreated;
    onOpenChangeRef.current = onOpenChange;
  }, [onBailCreated, onOpenChange]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Réinitialiser quand le drawer s'ouvre
  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const handleBailCreated = useCallback((bail: any) => {
    setIsSubmitting(false);
    if (onBailCreatedRef.current) {
      onBailCreatedRef.current(bail);
    }
    onOpenChangeRef.current(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (formRef.current && !isSubmitting) {
      setIsSubmitting(true);
      formRef.current.submit();
    }
  }, [isSubmitting]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setIsSubmitting(false);
    }
    onOpenChangeRef.current(newOpen);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsSubmitting(loading);
  }, []);

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className={isMobile ? "max-h-[95vh]" : "sm:max-w-2xl h-full"}>
        {isSubmitting && (
          <div className="absolute inset-0 z-50 rounded-[inherit]">
            <LoadingScreen
              variant="inline"
              message="Création du bail en cours..."
              description="Veuillez patienter pendant la création de votre bail"
              className="h-full justify-center"
            />
          </div>
        )}
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Créer un nouveau bail
          </DrawerTitle>
          <DrawerDescription>
            Remplissez les informations pour créer un nouveau bail
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <CreateBailForm
            ref={formRef}
            biens={biens}
            locataires={locataires}
            ownerId={ownerId}
            initialPropertyId={initialPropertyId}
            onBailCreated={handleBailCreated}
            hideActions={true}
            onLoadingChange={handleLoadingChange}
          />
        </div>
        <DrawerFooter>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Création..." : "Créer le bail"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

