"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Home, MapPin, Building2, Ruler, FileText, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/formatters";
import { CompletionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { BailDocumentPreview } from "./bail-document-preview";

const completionStatusLabels: Record<CompletionStatus, string> = {
  NOT_STARTED: "Non commencé",
  PARTIAL: "Partiel",
  PENDING_CHECK: "En vérification",
  COMPLETED: "Complété",
};

const completionStatusColors: Record<CompletionStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-200",
  PARTIAL: "bg-orange-100 text-orange-800 border-orange-200",
  PENDING_CHECK: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
};

interface PropertyDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function PropertyDetailDrawer({
  open,
  onOpenChange,
  propertyId,
}: PropertyDetailDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (open && propertyId) {
      setLoading(true);
      fetch(`/api/client/properties/${propertyId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Erreur lors de la récupération du bien");
          }
          return res.json();
        })
        .then((data) => {
          setProperty(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [open, propertyId]);

  if (!property && !loading) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className={isMobile ? "max-h-[85vh]" : "sm:max-w-lg h-full"}>
        <DrawerHeader className="border-b shrink-0">
          <DrawerTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Détails du bien
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : property ? (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Informations principales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Informations générales
                    </div>
                    {property.completionStatus && (
                      <Badge
                        className={cn(
                          "text-xs",
                          completionStatusColors[property.completionStatus as CompletionStatus]
                        )}
                      >
                        {completionStatusLabels[property.completionStatus as CompletionStatus]}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {property.label && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Label</p>
                        <p className="text-sm font-medium">{property.label}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Adresse complète</p>
                      <p className="text-sm font-medium flex items-start gap-2">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                        {property.fullAddress}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                      {property.surfaceM2 && (
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Surface</p>
                            <p className="text-sm font-medium">{property.surfaceM2.toString()} m²</p>
                          </div>
                        </div>
                      )}
                      {property.type && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="text-sm font-medium">{property.type}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {(property.createdAt || property.updatedAt) && (
                      <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                        {property.createdAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Créé le</p>
                              <p className="text-sm font-medium">{formatDate(property.createdAt)}</p>
                            </div>
                          </div>
                        )}
                        {property.updatedAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Modifié le</p>
                              <p className="text-sm font-medium">{formatDate(property.updatedAt)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pièces liées au bien */}
              {property.documents && property.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Pièces liées au bien
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {property.documents.length} pièce{property.documents.length > 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {property.documents.map((document: any) => (
                        <BailDocumentPreview
                          key={document.id}
                          document={{
                            id: document.id,
                            label: document.label,
                            kind: document.kind,
                            fileKey: document.fileKey,
                            mimeType: document.mimeType,
                            createdAt: document.createdAt,
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

