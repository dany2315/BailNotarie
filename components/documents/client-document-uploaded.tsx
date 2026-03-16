"use client";

import React, { useEffect, useState } from "react";
import { DocumentStackList } from "@/components/documents/document-stack-list";
import { FileUpload } from "@/components/ui/file-upload";

interface ClientDocumentUploadedProps {
  clientId: string;
  documentKind: string;
  documents: Array<{
    id: string;
    kind: string;
    fileKey: string;
    label?: string | null;
    mimeType?: string | null;
    size?: number | null;
    createdAt?: Date | string | null;
  }>;
  onDelete: (documentId: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  label: string;
  required?: boolean;
  personId?: string;
  personIndex?: number;
  documentEntrepriseId?: string;
  disabled?: boolean;
  accept?: string;
}

/**
 * Bloc document pour l'interface client : même rendu que dans le formulaire d'intake.
 * Label + zone d'upload (compacte "Ajouter un fichier" quand des documents existent) + pile des documents uploadés.
 */
export function ClientDocumentUploaded({
  clientId,
  documentKind,
  documents,
  onDelete,
  onRefresh,
  label,
  required = false,
  personId,
  personIndex,
  documentEntrepriseId,
  disabled = false,
  accept = "application/pdf,image/*",
}: ClientDocumentUploadedProps) {
  const hasDocuments = documents.length > 0;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await onDelete(documentId);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const handleRefresh = () => {
      onRefresh();
    };
    window.addEventListener(`document-uploaded-client-${clientId}`, handleRefresh);
    return () => {
      window.removeEventListener(`document-uploaded-client-${clientId}`, handleRefresh);
    };
  }, [clientId, onRefresh]);

  return (
    <div className="min-w-0 space-y-3 overflow-visible">
      <div className="space-y-2 min-w-0 overflow-visible">
        <ClientDocumentUploadedFileUpload
          clientId={clientId}
          documentKind={documentKind}
          hasDocuments={hasDocuments}
          disabled={disabled}
          accept={accept}
          label={label}
          required={required}
          personId={personId}
          personIndex={personIndex}
          documentEntrepriseId={documentEntrepriseId}
          onUploadComplete={onRefresh}
        />
      </div>
      <div className="min-w-0 overflow-visible">
        <DocumentStackList
          documents={documents}
          deletingId={deletingId}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

interface ClientDocumentUploadedFileUploadProps {
  clientId: string;
  documentKind: string;
  hasDocuments: boolean;
  disabled: boolean;
  accept: string;
  label: string;
  required: boolean;
  personId?: string;
  personIndex?: number;
  documentEntrepriseId?: string;
  onUploadComplete: () => void | Promise<void>;
}

function ClientDocumentUploadedFileUpload({
  clientId,
  documentKind,
  hasDocuments,
  disabled,
  accept,
  label,
  required,
  personId,
  personIndex,
  documentEntrepriseId,
  onUploadComplete,
}: ClientDocumentUploadedFileUploadProps) {
  return (
    <FileUpload
      label={label}
      multiple
      accept={accept}
      disabled={disabled}
      required={required}
      documentKind={documentKind}
      documentClientId={clientId}
      documentPersonId={personId}
      documentEntrepriseId={documentEntrepriseId}
      personIndex={personIndex}
      compact={hasDocuments}
      onUploadComplete={() => onUploadComplete()}
      onUploadStateChange={() => {}}
    />
  );
}
