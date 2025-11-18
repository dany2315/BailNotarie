"use client";

import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "./document-viewer";
import { formatDateTime } from "@/lib/utils/formatters";

interface Document {
  id: string;
  kind: string;
  fileKey: string;
  mimeType?: string | null;
  label?: string | null;
  createdAt: Date | string;
}

interface DocumentsListProps {
  documents: Document[];
  documentKindLabels: Record<string, string>;
}

export function DocumentsList({ documents, documentKindLabels }: DocumentsListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document</p>;
  }

  return (
    <div className="space-y-1.5">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="size-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {documentKindLabels[doc.kind] || doc.kind}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(doc.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DocumentViewer
              document={doc}
              documentKindLabels={documentKindLabels}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <Eye className="size-4" />
              </Button>
            </DocumentViewer>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              asChild
            >
              <a href={doc.fileKey} download target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}



