"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { deleteDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { getPdfPreviewUrl } from "@/lib/utils/pdf-preview";

type UploadItemStatus = "selected" | "uploading" | "uploaded" | "error";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: UploadItemStatus;
  fileKey?: string;
  documentId?: string;
  isRemoving?: boolean;
  error?: string;
}

interface FileUploadProps {
  label: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  uploadToken?: string;
  documentClientId?: string;
  documentPersonId?: string;
  documentEntrepriseId?: string;
  documentPropertyId?: string;
  documentBailId?: string;
  documentKind?: string;
  personIndex?: number;
  onUploadComplete?: (blobUrl: string) => void;
  onUploadsComplete?: (blobUrls: string[]) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  /** Quand true, affiche un simple lien "Ajouter un fichier" au lieu de la grande zone de dépôt (ex. quand des fichiers sont déjà uploadés). */
  compact?: boolean;
}

function buildUploadId(file: File, suffix?: string) {
  const base = `${file.name}-${file.size}-${file.lastModified}`;
  return suffix ? `${base}-${suffix}` : base;
}

export function FileUpload({
  label,
  value,
  onChange,
  files,
  onFilesChange,
  multiple = false,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  disabled = false,
  required = false,
  error,
  uploadToken,
  documentKind,
  documentClientId,
  documentPersonId,
  documentEntrepriseId,
  documentPropertyId,
  documentBailId,
  personIndex,
  onUploadComplete,
  onUploadsComplete,
  onUploadProgress,
  onUploadStateChange,
  compact = false,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isStackExpanded, setIsStackExpanded] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [previewItem, setPreviewItem] = useState<UploadItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [previewPdfError, setPreviewPdfError] = useState(false);

  const isMultipleMode = multiple || Boolean(onFilesChange);
  const externalFiles = useMemo(() => {
    if (isMultipleMode) {
      return files ?? [];
    }
    return value ? [value] : [];
  }, [files, isMultipleMode, value]);

  const syncSingleValue = useCallback(
    (file: File | null) => {
      onChange?.(file);
    },
    [onChange]
  );

  const syncMultipleValue = useCallback(
    (nextFiles: File[]) => {
      onFilesChange?.(nextFiles);
      if (!isMultipleMode) {
        onChange?.(nextFiles[0] ?? null);
      }
    },
    [isMultipleMode, onChange, onFilesChange]
  );

  const updateUploadItem = useCallback((itemId: string, patch: Partial<UploadItem>) => {
    setUploadItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  }, []);

  const getSignedUrlForDocument = useCallback(async (fileKey: string): Promise<string> => {
    try {
      const response = await fetch("/api/blob/get-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération de l'URL signée");
      }

      const { signedUrl } = await response.json();
      return signedUrl;
    } catch {
      const { getS3PublicUrl } = await import("@/hooks/use-s3-public-url");
      return getS3PublicUrl(fileKey) || fileKey;
    }
  }, []);

  const createObjectUrl = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return objectUrl;
  };

  const getItemUrl = useCallback(
    async (item: UploadItem) => {
      if (item.fileKey) {
        return getSignedUrlForDocument(item.fileKey);
      }
      return createObjectUrl(item.file);
    },
    [getSignedUrlForDocument]
  );

  const getPreviewFileType = useCallback((item: UploadItem): "image" | "pdf" | "other" => {
    const mime = item.file?.type;
    if (mime) {
      if (mime.startsWith("image/")) return "image";
      if (mime === "application/pdf") return "pdf";
      return "other";
    }
    const name = item.file?.name || item.fileKey || "";
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  }, []);

  const handlePreview = useCallback((item: UploadItem) => {
    setPreviewItem(item);
    setPreviewUrl(null);
    setPreviewLoading(true);
    setPreviewImageError(false);
    setPreviewPdfError(false);
  }, []);

  // Charger l'URL (signée ou object URL) quand le dialog de preview s'ouvre
  const loadPreviewUrl = useCallback(async () => {
    if (!previewItem) return;
    setPreviewLoading(true);
    try {
      const url = await getItemUrl(previewItem);
      setPreviewUrl(url);
    } catch (err) {
      console.error("[FileUpload] Erreur lors du chargement de la prévisualisation:", err);
      toast.error("Impossible de charger le fichier");
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewItem, getItemUrl]);

  const handlePreviewOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setPreviewItem(null);
      setPreviewUrl(null);
      setPreviewImageError(false);
      setPreviewPdfError(false);
    }
  }, []);

  useEffect(() => {
    if (previewItem) {
      loadPreviewUrl();
    } else {
      setPreviewUrl(null);
    }
  }, [previewItem, loadPreviewUrl]);

  const handleDownload = useCallback(
    async (item: UploadItem) => {
      try {
        const url = await getItemUrl(item);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = item.file.name;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      } catch (downloadError) {
        console.error("[FileUpload] Erreur lors du téléchargement:", downloadError);
        toast.error("Impossible de télécharger le fichier");
      }
    },
    [getItemUrl]
  );

  const uploadFileToS3 = useCallback(
    async (file: File, signedUrl: string, itemId: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) {
            return;
          }
          const percent = (event.loaded / event.total) * 100;
          updateUploadItem(itemId, { progress: percent, status: "uploading" });
          onUploadProgress?.(percent);
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateUploadItem(itemId, { progress: 100, status: "uploaded" });
            onUploadProgress?.(100);
            resolve();
            return;
          }

          reject(
            new Error(
              `Upload failed with status ${xhr.status}: ${xhr.statusText || xhr.responseText || "Unknown error"}`
            )
          );
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed due to network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload was aborted")));

        xhr.open("PUT", signedUrl, true);
        xhr.send(file);
      }),
    [onUploadProgress, updateUploadItem]
  );

  const requestSignedUrl = useCallback(
    async (file: File) => {
      const response = await fetch("/api/blob/generate-upload-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(uploadToken && { token: uploadToken }),
          ...(documentClientId && { clientId: documentClientId }),
          ...(documentPersonId && { personId: documentPersonId }),
          ...(documentEntrepriseId && { entrepriseId: documentEntrepriseId }),
          ...(documentPropertyId && { propertyId: documentPropertyId }),
          ...(documentBailId && { bailId: documentBailId }),
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          ...(documentKind && { documentKind }),
        }),
      });

      if (!response.ok) {
        const responseError = await response.json();
        throw new Error(responseError.error || "Erreur lors de la récupération de l'URL signée");
      }

      return response.json() as Promise<{ signedUrl: string; fileKey: string }>;
    },
    [
      documentBailId,
      documentClientId,
      documentEntrepriseId,
      documentKind,
      documentPersonId,
      documentPropertyId,
      uploadToken,
    ]
  );

  const createDocumentRecord = useCallback(
    async (file: File, fileKey: string) => {
      const response = await fetch("/api/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(uploadToken && { token: uploadToken }),
          ...(documentClientId && { clientId: documentClientId }),
          ...(documentPersonId && { personId: documentPersonId }),
          ...(documentEntrepriseId && { entrepriseId: documentEntrepriseId }),
          ...(documentPropertyId && { propertyId: documentPropertyId }),
          ...(documentBailId && { bailId: documentBailId }),
          fileKey,
          kind: documentKind,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          label: file.name,
          ...(personIndex !== undefined && { personIndex }),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du document");
      }

      return data.document as {
        id: string;
        kind: string;
        label?: string | null;
        fileKey: string;
        mimeType?: string | null;
        size?: number | null;
        createdAt?: string;
      };
    },
    [
      documentBailId,
      documentClientId,
      documentEntrepriseId,
      documentKind,
      documentPersonId,
      documentPropertyId,
      personIndex,
      uploadToken,
    ]
  );

  const dispatchRefreshEvents = useCallback((uploadedDocuments?: Array<{ id: string; kind: string; label?: string | null; fileKey: string; mimeType?: string | null; size?: number | null; createdAt?: string } & { personIndex?: number }>) => {
    if (uploadToken) {
      window.dispatchEvent(
        new CustomEvent(`document-uploaded-${uploadToken}`, {
          detail: uploadedDocuments?.length ? { documents: uploadedDocuments } : undefined,
        })
      );
    }
    if (documentClientId) {
      window.dispatchEvent(new CustomEvent(`document-uploaded-client-${documentClientId}`));
    }
    if (documentPropertyId) {
      window.dispatchEvent(new CustomEvent(`document-uploaded-property-${documentPropertyId}`));
    }
  }, [documentClientId, documentPropertyId, uploadToken]);

  const syncFilesFromItems = useCallback(
    (items: UploadItem[]) => {
      const nextFiles = items
        .filter((item) => !item.isRemoving && item.status !== "error")
        .map((item) => item.file);

      if (isMultipleMode) {
        syncMultipleValue(nextFiles);
      } else {
        syncSingleValue(nextFiles[0] ?? null);
      }
    },
    [isMultipleMode, syncMultipleValue, syncSingleValue]
  );

  const processFiles = useCallback(
    async (selectedFiles: File[]) => {
      if (selectedFiles.length === 0) {
        if (isMultipleMode) {
          syncMultipleValue([]);
        } else {
          syncSingleValue(null);
        }
        return;
      }

      if (!documentKind) {
        const nextItems = selectedFiles.map((file) => ({
          id: buildUploadId(file),
          file,
          progress: 0,
          status: "selected" as const,
          isRemoving: false,
        }));

        const mergedItems = isMultipleMode ? [...uploadItems, ...nextItems] : nextItems;
        setUploadItems(mergedItems);
        syncFilesFromItems(mergedItems);
        return;
      }

      const queuedItems: UploadItem[] = selectedFiles.map((file) => ({
        id: buildUploadId(file, Math.random().toString(36).slice(2)),
        file,
        progress: 0,
        status: "selected",
        isRemoving: false,
      }));

      const previousItems = uploadItems;
      const nextItems = [...previousItems, ...queuedItems];
      setUploadItems(nextItems);
      syncFilesFromItems(nextItems);
      setIsUploading(true);
      onUploadStateChange?.(true);

      const uploadedKeys: string[] = [];
      const uploadedItemIds: string[] = [];
      const uploadedDocuments: Array<{ id: string; kind: string; label?: string | null; fileKey: string; mimeType?: string | null; size?: number | null; createdAt?: string; personIndex?: number }> = [];
      const uploadErrors: string[] = [];

      try {
        for (const item of queuedItems) {
          updateUploadItem(item.id, { status: "uploading", progress: 0 });

          try {
            const { signedUrl, fileKey } = await requestSignedUrl(item.file);
            await uploadFileToS3(item.file, signedUrl, item.id);
            const document = await createDocumentRecord(item.file, fileKey);

            uploadedKeys.push(fileKey);
            uploadedItemIds.push(item.id);
            uploadedDocuments.push({
              ...document,
              ...(personIndex !== undefined && { personIndex }),
            });
            updateUploadItem(item.id, {
              status: "uploaded",
              progress: 100,
              fileKey,
              documentId: document.id,
            });

            onUploadComplete?.(fileKey);
          } catch (uploadError: any) {
            const message = uploadError?.message || "Erreur lors de l'upload du fichier";
            uploadErrors.push(`${item.file.name}: ${message}`);
            updateUploadItem(item.id, {
              status: "error",
              progress: 0,
              error: message,
            });
          }
        }

        if (uploadedKeys.length > 0) {
          onUploadsComplete?.(uploadedKeys);
          // Envoyer les documents créés pour affichage optimiste, puis refetch après un court délai
          dispatchRefreshEvents(uploadedDocuments);
          setTimeout(() => dispatchRefreshEvents(), 200);
        }

        setUploadItems((current) => {
          // En mode intake (documentKind), retirer les fichiers uploadés de la pile :
          // ils apparaîtront dans DocumentStackList après refetch, évitant la duplication.
          const idsToRemove = new Set(uploadedItemIds);
          const next =
            documentKind && idsToRemove.size > 0
              ? current.filter((item) => !idsToRemove.has(item.id))
              : current;
          syncFilesFromItems(next);
          return next;
        });

        if (uploadedKeys.length > 0 && uploadErrors.length === 0) {
          toast.success(
            uploadedKeys.length > 1
              ? `${uploadedKeys.length} fichiers uploadés avec succès`
              : "Fichier uploadé avec succès"
          );
        } else if (uploadedKeys.length > 0) {
          toast.warning("Certains fichiers n'ont pas pu être uploadés", {
            description: uploadErrors.slice(0, 2).join(" | "),
          });
        } else {
          toast.error(uploadErrors[0] || "Erreur lors de l'upload des fichiers");
        }
      } finally {
        setIsUploading(false);
        onUploadStateChange?.(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [
      createDocumentRecord,
      dispatchRefreshEvents,
      documentKind,
      isMultipleMode,
      onUploadComplete,
      onUploadStateChange,
      onUploadsComplete,
      requestSignedUrl,
      syncFilesFromItems,
      syncMultipleValue,
      syncSingleValue,
      updateUploadItem,
      uploadFileToS3,
      uploadItems,
    ]
  );

  const handleFileSelection = useCallback(
    async (fileList: FileList | File[]) => {
      const selectedFiles = Array.from(fileList);
      const normalizedFiles = isMultipleMode ? selectedFiles : selectedFiles.slice(0, 1);
      await processFiles(normalizedFiles);
    },
    [isMultipleMode, processFiles]
  );

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }
    await handleFileSelection(event.target.files);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (!event.dataTransfer.files?.length) {
      return;
    }
    await handleFileSelection(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeItem = useCallback(
    async (index: number) => {
      if (isUploading) {
        return;
      }

      if (uploadItems.length > 0) {
        const item = uploadItems[index];
        if (!item) {
          return;
        }

        const isPendingUpload = Boolean(documentKind) && (item.status === "selected" || item.status === "uploading");
        if (item.isRemoving || isPendingUpload) {
          return;
        }

        if (item.documentId) {
          updateUploadItem(item.id, { isRemoving: true });
          try {
            await deleteDocument(item.documentId);
            toast.success("Document supprimé avec succès");
            dispatchRefreshEvents();
          } catch (deleteError: any) {
            updateUploadItem(item.id, { isRemoving: false });
            toast.error(deleteError?.message || "Impossible de supprimer le document");
            return;
          }
        }

        const nextUploadItems = uploadItems.filter((_, itemIndex) => itemIndex !== index);
        setUploadItems(nextUploadItems);
        syncFilesFromItems(nextUploadItems);

        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }

      if (isMultipleMode) {
        const nextFiles = externalFiles.filter((_, fileIndex) => fileIndex !== index);
        syncMultipleValue(nextFiles);
      } else {
        syncSingleValue(null);
      }

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [
      dispatchRefreshEvents,
      documentKind,
      externalFiles,
      isMultipleMode,
      isUploading,
      syncFilesFromItems,
      syncMultipleValue,
      syncSingleValue,
      updateUploadItem,
      uploadItems,
    ]
  );

  const renderedItems: UploadItem[] =
    uploadItems.length > 0
      ? uploadItems
      : externalFiles.map((file) => ({
          id: buildUploadId(file),
          file,
          progress: 0,
          status: "selected" as const,
          isRemoving: false,
        }));

  const activeLargeFile = renderedItems.find(
    (item) => item.status === "uploading" && item.file.size / (1024 * 1024) >= 1
  );
  const isUploadedStack =
    renderedItems.length > 1 &&
    renderedItems.every((item) => item.status === "uploaded" && !item.isRemoving);
  const isCollapsedStack = isUploadedStack && !isStackExpanded;

  // Stack visuelle : décalage vertical 10px par carte, scale -2% par carte.
  // Marges : pile repliée -32px (mobile) / -48px (desktop), étendue 4px (mobile) / 8px (desktop).
  const STACK_OFFSET_PX = 10;
  const STACK_SCALE_FACTOR = 0.02;
  const renderUploadStack = () => {
    if (renderedItems.length === 0) {
      return null;
    }

    return (
      <div
        className="space-y-2"
        onMouseEnter={() => setIsStackExpanded(true)}
        onMouseLeave={() => setIsStackExpanded(false)}
        onFocusCapture={() => setIsStackExpanded(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsStackExpanded(false);
          }
        }}
        onClick={() => {
          if (isCollapsedStack) {
            setIsStackExpanded(true);
          }
        }}
      >
        {renderedItems.map((item, index) => {
          const isPendingUpload = Boolean(documentKind) && (item.status === "selected" || item.status === "uploading");
          const isBusy = item.isRemoving || isPendingUpload;
          const statusIcon = item.isRemoving ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : item.status === "uploaded" ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : item.status === "error" ? (
            <AlertCircle className="size-4 text-destructive" />
          ) : item.status === "uploading" ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          );

          const canOpen = !item.isRemoving && (item.status === "uploaded" || (!documentKind && item.status === "selected"));
          const canRemove = !item.isRemoving && (item.status === "uploaded" || item.status === "error" || !documentKind);
          const stackDepth = index;
          const isBehindInCollapsedStack = isCollapsedStack && index > 0;
          const stackStyle = isCollapsedStack
            ? {
                transform:
                  index === 0
                    ? "translateY(0) scale(1)"
                    : `translateY(-${stackDepth * STACK_OFFSET_PX}px) scale(${1 - stackDepth * STACK_SCALE_FACTOR})`,
                zIndex: renderedItems.length - index,
              }
            : undefined;

          return (
            <div
              key={item.id}
              className={cn(
                "relative rounded-xl border bg-background/95 px-3 py-3 shadow-sm transition-all duration-300 ease-out",
                index > 0 && (isCollapsedStack ? "-mt-16 sm:-mt-12" : "mt-1 sm:mt-2"),
                isBehindInCollapsedStack && "pointer-events-none select-none"
              )}
              style={stackStyle}
            >
              <div
                className={cn(
                  "flex items-start gap-3 transition-opacity duration-200",
                  isBehindInCollapsedStack && "opacity-0"
                )}
              >
                <div className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-2 text-primary">{statusIcon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        {item.isRemoving && " - Suppression..."}
                        {item.status === "selected" && documentKind && " - En attente"}
                        {item.status === "uploading" && ` - ${Math.round(item.progress)} %`}
                        {!item.isRemoving && item.status === "uploaded" && " - Uploadé"}
                        {item.status === "error" && item.error ? ` - ${item.error}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {canOpen && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              event.nativeEvent.stopImmediatePropagation();
                              handlePreview(item);
                            }}
                            title="Voir le fichier"
                            disabled={isBusy}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              event.nativeEvent.stopImmediatePropagation();
                              handleDownload(item);
                            }}
                            title="Télécharger le fichier"
                            disabled={isBusy}
                          >
                            <Download className="size-4" />
                          </Button>
                        </>
                      )}
                      {canRemove && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            event.nativeEvent.stopImmediatePropagation();
                            removeItem(index);
                          }}
                          title="Retirer le fichier"
                          disabled={isBusy}
                        >
                          {item.isRemoving ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.status === "uploading" && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Upload en cours</span>
                        <span>{Math.round(item.progress)} %</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(item.progress, 1)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDropzone = (mobile: boolean) => (
    <div
      className={cn(
        mobile ? "block p-3 sm:hidden" : "hidden p-6 sm:block",
        "rounded-xl border border-dashed text-center transition-colors",
        isDragging && "border-primary bg-primary/5",
        (disabled || isUploading) && "cursor-not-allowed opacity-50",
        !disabled && !isUploading && "cursor-pointer hover:border-primary/50 hover:bg-muted/20"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
        if (!disabled && !isUploading) {
          inputRef.current?.click();
        }
      }}
    >
      <Input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
        multiple={isMultipleMode || Boolean(documentKind)}
      />
      <Upload className={cn("mx-auto mb-2 text-muted-foreground", mobile ? "size-6" : "size-8")} />
      <p className={cn("text-muted-foreground", mobile ? "text-xs" : "text-sm")}>
        {isMultipleMode || documentKind
          ? "Cliquez ou glissez-déposez plusieurs fichiers"
          : "Cliquez ou glissez-déposez un fichier"}
      </p>
      <p className={cn("mt-1 text-muted-foreground", mobile ? "text-[10px]" : "text-xs")}>
        PDF, DOC, DOCX, JPG, PNG
      </p>
    </div>
  );

  const renderCompactTrigger = () => (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-dashed py-2 px-3 text-sm transition-colors",
        isDragging && "border-primary bg-primary/5",
        (disabled || isUploading) && "cursor-not-allowed opacity-50",
        !disabled && !isUploading && "cursor-pointer hover:border-primary/40 hover:bg-muted/30"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => {
        if (!disabled && !isUploading) {
          inputRef.current?.click();
        }
      }}
    >
      <Input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        className="hidden"
        multiple={isMultipleMode || Boolean(documentKind)}
      />
      <Upload className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">
        {isUploading ? "Upload en cours…" : "Ajouter un fichier"}
      </span>
    </div>
  );

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {renderUploadStack()}
      {compact ? renderCompactTrigger() : (
        <>
          {renderDropzone(false)}
          {renderDropzone(true)}
        </>
      )}

      {activeLargeFile ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            L'upload peut prendre du temps ({(activeLargeFile.file.size / 1024 / 1024).toFixed(2)} MB). Ne quittez pas la page.
          </p>
        </div>
      ) : null}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={!!previewItem} onOpenChange={(open) => handlePreviewOpenChange(open)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem && (
                <>
                  {getPreviewFileType(previewItem) === "image" && <ImageIcon className="size-5" />}
                  {getPreviewFileType(previewItem) === "pdf" && <FileText className="size-5" />}
                  {getPreviewFileType(previewItem) === "other" && <File className="size-5" />}
                  <span className="truncate">{previewItem.file.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto p-4 bg-muted/30 rounded-lg min-h-[50vh]">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-6">
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-background/80 px-10 py-12 shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="size-7 animate-spin text-primary" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">Chargement du document</p>
                      {previewItem && (
                        <p className="text-xs text-muted-foreground truncate max-w-[280px]" title={previewItem.file.name}>
                          {previewItem.file.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              ) : previewItem && previewUrl ? (
                (() => {
                  const item = previewItem;
                  const url = previewUrl;
                  return (
                    <>
                      {getPreviewFileType(item) === "image" && !previewImageError && (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={url}
                            alt={item.file.name}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg"
                            onError={() => setPreviewImageError(true)}
                          />
                        </div>
                      )}
                      {getPreviewFileType(item) === "pdf" && !previewPdfError && (
                        <div className="w-full h-full">
                          <iframe
                            src={getPdfPreviewUrl(url)}
                            className="w-full h-[70vh] rounded-lg border"
                            title={item.file.name}
                            onError={() => setPreviewPdfError(true)}
                          />
                        </div>
                      )}
                      {(getPreviewFileType(item) === "image" && previewImageError) ||
                      (getPreviewFileType(item) === "pdf" && previewPdfError) ||
                      getPreviewFileType(item) === "other" ? (
                        <div className="text-center p-8 space-y-4">
                          {getPreviewFileType(item) === "image" && <ImageIcon className="size-16 mx-auto text-muted-foreground" />}
                          {getPreviewFileType(item) === "pdf" && <FileText className="size-16 mx-auto text-muted-foreground" />}
                          {getPreviewFileType(item) === "other" && <File className="size-16 mx-auto text-muted-foreground" />}
                          <p className="text-muted-foreground">
                            {getPreviewFileType(item) === "other"
                              ? "Ce type de fichier ne peut pas être prévisualisé"
                              : "Impossible de charger le fichier"}
                          </p>
                        </div>
                      ) : null}
                    </>
                  );
                })()
              ) : previewItem ? (
                <div className="text-center p-8">
                  <p className="text-sm text-destructive">Impossible de charger le fichier</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => handlePreviewOpenChange(false)}>
                    Fermer
                  </Button>
                </div>
              ) : null}
            </div>
            {previewItem && previewUrl && (
              <div className="flex justify-end pt-3 border-t mt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4 mr-2" />
                    Ouvrir dans un onglet
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
