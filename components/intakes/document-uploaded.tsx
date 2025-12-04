"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { File, Eye, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getIntakeDocuments } from "@/lib/actions/intakes";
import { deleteDocument } from "@/lib/actions/documents";
import { toast } from "sonner";
import { DocumentKind } from "@prisma/client";

interface DocumentUploadedProps {
  token: string;
  documentKind: string;
  clientId?: string; // Optionnel : pour filtrer les documents par client (utile pour le formulaire locataire)
  personIndex?: number; // Optionnel : pour filtrer les documents par personne (index dans le tableau persons)
  onDelete?: (documentId: string) => void;
  children?: ReactNode;
}

// Cache global pour éviter les chargements multiples du même token
const tokenDocumentsCache = new Map<string, Promise<any[]>>();
const tokenDocumentsData = new Map<string, any[]>();

// Fonction pour invalider le cache d'un token
export function invalidateDocumentCache(token: string) {
  tokenDocumentsCache.delete(token);
  tokenDocumentsData.delete(token);
}

export function DocumentUploaded({ token, documentKind, clientId, personIndex, onDelete, children }: DocumentUploadedProps) {
  const [document, setDocument] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isViewerOpenRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const getDocumentLabel = (kind: string) => {
    switch (kind) {
      case DocumentKind.BIRTH_CERT:
        return "Acte de naissance";
      case DocumentKind.ID_IDENTITY:
        return "Pièce d'identité";
      case DocumentKind.LIVRET_DE_FAMILLE:
        return "Livret de famille";
      case DocumentKind.CONTRAT_DE_PACS:
        return "Contrat de PACS";
      case DocumentKind.DIAGNOSTICS:
        return "Diagnostics";
      case DocumentKind.REGLEMENT_COPROPRIETE:
        return "Règlement de copropriété";
      case DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT:
        return "Cahier de charge de lotissement";
      case DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE:
        return "Statut de l'association syndicale";
      case DocumentKind.RIB:
        return "RIB";
      case DocumentKind.INSURANCE:
        return "Assurance";
      case DocumentKind.TITLE_DEED:
        return "Titre de propriété";
      case DocumentKind.STATUTES:
        return "Statuts";
      case DocumentKind.KBIS:
        return "KBIS";
      default:
        return `Document ${kind}`;
    }
  };

  // Charger tous les documents pour ce token
  useEffect(() => {
    // Réinitialiser hasLoadedRef si refreshKey change
    hasLoadedRef.current = false;

      const loadDocuments = async () => {
      // Vérifier si les documents sont déjà en cache
      if (tokenDocumentsData.has(token)) {
        const allDocs = tokenDocumentsData.get(token) || [];
        // Filtrer par kind et optionnellement par clientId ou personIndex
        let filteredDocs = allDocs.filter((doc) => doc.kind === documentKind);
        if (clientId) {
          filteredDocs = filteredDocs.filter((doc) => doc.clientId === clientId);
        }
        // Si personIndex est fourni, on doit récupérer l'intakeLink pour obtenir la personne correspondante
        // Pour l'instant, on filtre par personId si présent dans le document
        // (on supposera que les documents sont déjà filtrés correctement par getIntakeDocuments)
        const foundDoc = filteredDocs
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        setDocument(foundDoc || null);
        setLoading(false);
        return;
      }

      // Vérifier si un chargement est déjà en cours
      const existingPromise = tokenDocumentsCache.get(token);
      if (existingPromise) {
        try {
          const allDocs = await existingPromise;
          if (allDocs) {
            // Filtrer par kind et optionnellement par clientId ou personIndex
            let filteredDocs = allDocs.filter((doc) => doc.kind === documentKind);
            if (clientId) {
              filteredDocs = filteredDocs.filter((doc) => doc.clientId === clientId);
            }
            // Note: personIndex sera géré côté serveur via getIntakeLinkByToken qui inclut les personnes
            // Ici on filtre seulement par kind et clientId
            const foundDoc = filteredDocs
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            setDocument(foundDoc || null);
          }
          setLoading(false);
        } catch (error) {
          console.error("Erreur lors du chargement des documents:", error);
          setLoading(false);
        }
        return;
      }

      // Lancer le chargement et le mettre en cache
      setLoading(true);
      const loadPromise = getIntakeDocuments(token);
      tokenDocumentsCache.set(token, loadPromise);

      try {
        const allDocs = await loadPromise;
        tokenDocumentsData.set(token, allDocs);
        tokenDocumentsCache.delete(token); // Nettoyer le cache de promesses

        // Filtrer par kind et optionnellement par clientId
        let filteredDocs = allDocs.filter((doc) => doc.kind === documentKind);
        if (clientId) {
          filteredDocs = filteredDocs.filter((doc) => doc.clientId === clientId);
        }
        // Note: personIndex sera géré côté serveur via getIntakeLinkByToken qui inclut les personnes
        // Ici on filtre seulement par kind et clientId
        const foundDoc = filteredDocs
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        setDocument(foundDoc || null);
      } catch (error) {
        console.error("Erreur lors du chargement des documents:", error);
        tokenDocumentsCache.delete(token);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, documentKind, clientId, personIndex, refreshKey]);

  // Écouter les événements de rechargement
  useEffect(() => {
    const handleRefresh = () => {
      invalidateDocumentCache(token);
      hasLoadedRef.current = false;
      setRefreshKey(prev => prev + 1);
    };

    // Écouter l'événement personnalisé pour ce token
    window.addEventListener(`document-uploaded-${token}`, handleRefresh);
    
    return () => {
      window.removeEventListener(`document-uploaded-${token}`, handleRefresh);
    };
  }, [token]);

  // Mettre à jour la ref quand isViewerOpen change
  useEffect(() => {
    isViewerOpenRef.current = isViewerOpen;
  }, [isViewerOpen]);

  const handleViewDocument = (doc: any) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
  };

  const handleDownloadDocument = (doc: any) => {
    const link = document.createElement("a");
    link.href = doc.fileKey.startsWith("http") 
      ? doc.fileKey 
      : doc.fileKey.startsWith("/") 
        ? doc.fileKey 
        : `/${doc.fileKey}`;
    link.download = doc.label || `document-${doc.id}`;
    link.target = "_blank";
    link.click();
  };

  const handleDeleteClick = (doc: any) => {
    setDocumentToDelete(doc);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    setIsDeleteDialogOpen(false);
    
    try {
      await deleteDocument(documentToDelete.id);
      toast.success("Document supprimé avec succès");
      
      // Mettre à jour le cache local
      if (tokenDocumentsData.has(token)) {
        const allDocs = tokenDocumentsData.get(token) || [];
        const updatedDocs = allDocs.filter((d) => d.id !== documentToDelete.id);
        tokenDocumentsData.set(token, updatedDocs);
      }
      
      // Réinitialiser le document pour afficher le FileUpload
      setDocument(null);
      hasLoadedRef.current = false;
      
      // Appeler le callback si fourni
      if (onDelete) {
        onDelete(documentToDelete.id);
      }
      
      setDocumentToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression du document");
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="size-4" />;
    if (mimeType.includes("pdf")) return <File className="size-4 text-red-500" />;
    if (mimeType.includes("image")) return <File className="size-4 text-blue-500" />;
    return <File className="size-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Taille inconnue";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Si en chargement, afficher un skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Si aucun document, retourner children
  if (!document) {
    return children ? <>{children}</> : null;
  }

  return (
    <>
      <div className="p-3 border rounded-md bg-muted/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getDocumentIcon(document.mimeType)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                { getDocumentLabel(document.kind) }
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(document.size)} • {new Date(document.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleViewDocument(document)}
              title="Voir le document"
            >
              <Eye className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleDownloadDocument(document)}
              title="Télécharger le document"
            >
              <Download className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => handleDeleteClick(document)}
              title="Supprimer le document"
              disabled={isDeleting}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.label || "Aperçu du document"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedDocument && (
              <div className="space-y-4">
                {selectedDocument.mimeType?.includes("image") ? (
                  <img
                    src={selectedDocument.fileKey.startsWith("http") 
                      ? selectedDocument.fileKey 
                      : selectedDocument.fileKey.startsWith("/") 
                        ? selectedDocument.fileKey 
                        : `/${selectedDocument.fileKey}`}
                    alt={selectedDocument.label || "Document"}
                    className="max-w-full max-h-[70vh] mx-auto object-contain"
                  />
                ) : selectedDocument.mimeType?.includes("pdf") ? (
                  <iframe
                    src={selectedDocument.fileKey.startsWith("http") 
                      ? selectedDocument.fileKey 
                      : selectedDocument.fileKey.startsWith("/") 
                        ? selectedDocument.fileKey 
                        : `/${selectedDocument.fileKey}`}
                    className="w-full h-[70vh] border rounded"
                    title={selectedDocument.label || "Document PDF"}
                  />
                ) : (
                  <div className="text-center py-8">
                    <File className="size-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Aperçu non disponible pour ce type de fichier
                    </p>
                    <Button
                      onClick={() => handleDownloadDocument(selectedDocument)}
                      className="mt-4"
                    >
                      <Download className="size-4 mr-2" />
                      Télécharger le document
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer le document <span className="font-bold">{documentToDelete?.kind}</span> "{documentToDelete?.label || `Document ${documentToDelete?.kind}`}" ?
              Cette action est irréversible.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDocumentToDelete(null);
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
