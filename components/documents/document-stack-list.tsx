"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { useDownloadFile } from "@/hooks/use-download-file";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { cn } from "@/lib/utils";
import { Download, Eye, File, FileText, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

interface StackDocument {
  id: string;
  kind: string;
  fileKey: string;
  mimeType?: string | null;
  label?: string | null;
  size?: number | null;
  createdAt?: Date | string | null;
  /** Optionnel : pour afficher le propriétaire du document (ex. partie, personne, entreprise) */
  ownerLabel?: string | null;
}

interface DocumentStackListProps {
  documents: StackDocument[];
  onDelete?: (documentId: string) => void | Promise<void>;
  deletingId?: string | null;
  className?: string;
  compact?: boolean;
}

function formatSize(size?: number | null) {
  if (!size) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getDocumentIcon(document: StackDocument) {
  const mime = document.mimeType;
  if (mime?.startsWith("image/")) {
    return <ImageIcon className="size-4 text-sky-600" />;
  }

  if (mime === "application/pdf") {
    return <FileText className="size-4 text-rose-600" />;
  }

  const name = document.label || document.fileKey || "";
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
    return <ImageIcon className="size-4 text-sky-600" />;
  }

  if (ext === "pdf") {
    return <FileText className="size-4 text-rose-600" />;
  }

  return <File className="size-4 text-muted-foreground" />;
}

export function DocumentStackList({
  documents,
  onDelete,
  deletingId,
  className,
  compact = false,
}: DocumentStackListProps) {
  const { downloadFile, isDownloading } = useDownloadFile();
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  if (documents.length === 0) {
    return null;
  }

  const isStack = documents.length > 1;
  const isCollapsedStack = isStack && !isStackExpanded;
  const showCollapsedStackStyle = isCollapsedStack;

  // Même stack que FileUpload : décalage 10px par carte, scale -2% par carte.
  // Pile repliée : -32px (mobile) / -48px (desktop). Étendue : 4px (mobile) / 8px (desktop).
  const STACK_OFFSET_PX = 10;
  const STACK_SCALE_FACTOR = 0.02;

  return (
    <div
      className={cn("min-w-0 overflow-visible space-y-2", className)}
      onMouseEnter={() => isStack && setIsStackExpanded(true)}
      onMouseLeave={() => isStack && setIsStackExpanded(false)}
      onFocusCapture={() => isStack && setIsStackExpanded(true)}
      onBlurCapture={(e) => {
        if (isStack && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsStackExpanded(false);
        }
      }}
      onClick={() => {
        if (isCollapsedStack) setIsStackExpanded(true);
      }}
    >
      {documents.map((document, index) => {
        const uploadDate = document.createdAt
          ? new Date(document.createdAt).toLocaleDateString("fr-FR")
          : null;
        const documentType = documentKindLabels[document.kind] || document.kind;
        const ownerLabel = (document as StackDocument).ownerLabel;
        const documentNameAndSize = [
          document.label || null,
          formatSize(document.size),
        ].filter(Boolean);

        const isDeleting = deletingId === document.id;
        const stackDepth = index;
        const isBehindInCollapsedStack = isCollapsedStack && index > 0;
        const stackStyle = isCollapsedStack
          ? {
              transform:
                index === 0
                  ? "translateY(0) scale(1)"
                  : `translateY(-${stackDepth * STACK_OFFSET_PX}px) scale(${1 - stackDepth * STACK_SCALE_FACTOR})`,
              zIndex: documents.length - index,
            }
          : undefined;

        return (
          <div
            key={document.id}
            className={cn(
              "relative rounded-xl border bg-background/95 px-3 py-3 shadow-sm transition-all duration-300 ease-out",
              index > 0 && (showCollapsedStackStyle ? "-mt-16 sm:-mt-12" : "mt-1 sm:mt-2"),
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
              <div className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-2 text-primary">
                {getDocumentIcon(document)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {documentType}
                    </p>
                    {(documentNameAndSize.length > 0 || uploadDate || ownerLabel) && (
                      <div className="text-xs text-muted-foreground">
                        {ownerLabel && <p className="truncate font-medium text-foreground/80">{ownerLabel}</p>}
                        {documentNameAndSize.length > 0 && (
                          <p className="truncate">{documentNameAndSize.join(" - ")}</p>
                        )}
                        {uploadDate && <p>{uploadDate}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <DocumentViewer
                      document={document}
                      documentKindLabels={documentKindLabels}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(compact ? "h-7 w-7" : "h-8 w-8")}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </DocumentViewer>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(compact ? "h-7 w-7" : "h-8 w-8")}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                        downloadFile(
                          document.fileKey,
                          document.label || documentKindLabels[document.kind] || `document-${document.id}`
                        );
                      }}
                      disabled={isDownloading}
                    >
                      {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </Button>
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(compact ? "h-7 w-7" : "h-8 w-8", "text-destructive hover:text-destructive")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.nativeEvent.stopImmediatePropagation();
                          onDelete(document.id);
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
