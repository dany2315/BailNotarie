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
import { CreatePropertyForm, CreatePropertyFormRef } from "./create-property-form";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Building2, X } from "lucide-react";

interface CreatePropertyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  onPropertyCreated?: (property: any) => void;
}

export function CreatePropertyDrawer({
  open,
  onOpenChange,
  ownerId,
  onPropertyCreated,
}: CreatePropertyDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const formRef = useRef<CreatePropertyFormRef | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const isClosingRef = useRef(false);
  const onPropertyCreatedRef = useRef(onPropertyCreated);
  const onOpenChangeRef = useRef(onOpenChange);

  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onPropertyCreatedRef.current = onPropertyCreated;
    onOpenChangeRef.current = onOpenChange;
  }, [onPropertyCreated, onOpenChange]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Réinitialiser isClosingRef quand le drawer s'ouvre
  useEffect(() => {
    if (open) {
      isClosingRef.current = false;
      setIsSubmitting(false);
    }
  }, [open]);

  const handlePropertyCreated = useCallback((property: any) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsSubmitting(false);
    
    // Appeler le callback via la ref pour éviter les dépendances
    if (onPropertyCreatedRef.current) {
      onPropertyCreatedRef.current(property);
    }
    
    // Fermer le drawer de manière asynchrone
    requestAnimationFrame(() => {
      onOpenChangeRef.current(false);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (formRef.current && !isSubmitting) {
      setIsSubmitting(true);
      formRef.current.submit();
    }
  }, [isSubmitting]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      if (!isClosingRef.current) {
        isClosingRef.current = true;
      }
      setIsSubmitting(false);
    }
    onOpenChangeRef.current(newOpen);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsSubmitting(loading);
  }, []);

  const handleUploadingChange = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
  }, []);

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className={isMobile ? "max-h-[95vh]" : "sm:max-w-lg h-full"}>
        {isSubmitting && (
          <div className="absolute inset-0 z-50 rounded-[inherit]">
            <LoadingScreen
              variant="inline"
              message="Création du bien en cours..."
              description="Veuillez patienter pendant la création de votre bien immobilier"
              className="h-full justify-center"
            />
          </div>
        )}
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Créer un nouveau bien
          </DrawerTitle>
          <DrawerDescription>
            Remplissez les informations pour créer un nouveau bien immobilier
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4">
          <CreatePropertyForm
            ref={formRef}
            ownerId={ownerId}
            onPropertyCreated={handlePropertyCreated}
            hideActions={true}
            onLoadingChange={handleLoadingChange}
            onUploadingChange={handleUploadingChange}
          />
        </div>
        <DrawerFooter>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting || isUploading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className="flex-1"
            >
              {isUploading ? "Upload en cours..." : isSubmitting ? "Création..." : "Créer le bien"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

