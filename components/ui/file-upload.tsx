"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  label: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function FileUpload({
  label,
  value,
  onChange,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  disabled = false,
  required = false,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={label}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {value ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          <File className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">{value.name}</span>
          <span className="text-xs text-muted-foreground">
            {(value.size / 1024 / 1024).toFixed(2)} MB
          </span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={removeFile}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-md p-6 text-center transition-colors",
            isDragging && "border-primary bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "cursor-pointer hover:border-primary/50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <Input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Cliquez ou glissez-déposez un fichier
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOC, DOCX, JPG, PNG (max 10MB)
          </p>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}








