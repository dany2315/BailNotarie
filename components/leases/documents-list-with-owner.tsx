"use client";

import { FileText, Download, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentViewer } from "./document-viewer";
import { formatDateTime } from "@/lib/utils/formatters";

interface Document {
  id: string;
  kind: string;
  fileKey: string;
  mimeType?: string | null;
  label?: string | null;
  createdAt: Date | string;
  person?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    isPrimary: boolean;
  } | null;
  entreprise?: {
    id: string;
    legalName: string | null;
    name: string | null;
  } | null;
}

interface DocumentsListWithOwnerProps {
  documents: Document[];
  documentKindLabels: Record<string, string>;
  ownerLabel?: string; // Label pour les documents du client (ex: "Client", "Propriétaire", "Locataire")
}

export function DocumentsListWithOwner({ 
  documents, 
  documentKindLabels,
  ownerLabel 
}: DocumentsListWithOwnerProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document</p>;
  }

  const getOwnerName = (doc: Document): string | null => {
    if (doc.person) {
      const name = [doc.person.firstName, doc.person.lastName].filter(Boolean).join(" ");
      return name || null;
    }
    if (doc.entreprise) {
      return doc.entreprise.legalName || doc.entreprise.name || null;
    }
    return ownerLabel || null;
  };

  return (
    <div className="space-y-1.5">
      {documents.map((doc) => {
        const ownerName = getOwnerName(doc);
        const isPersonDocument = !!doc.person;
        const isPrimaryPerson = doc.person?.isPrimary;

        return (
          <div
            key={doc.id}
            className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="size-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">
                    {documentKindLabels[doc.kind] || doc.kind}
                  </p>
                  {ownerName && (
                    <Badge 
                      variant={isPersonDocument ? (isPrimaryPerson ? "default" : "outline") : "secondary"}
                      className="text-xs"
                    >
                      <User className="size-3 mr-1" />
                      {ownerName}
                    </Badge>
                  )}
                </div>
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
        );
      })}
    </div>
  );
}




