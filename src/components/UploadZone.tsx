'use client';

import { useRef, useState, useCallback } from 'react';

interface UploadZoneProps {
  label: string;
  accept?: string;
  onFile: (file: File) => void;
  file?: File | null;
  disabled?: boolean;
  className?: string;
}

export default function UploadZone({
  label,
  accept = 'video/mp4,video/quicktime,.mp4,.mov',
  onFile,
  file,
  disabled = false,
  className = '',
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
    },
    [onFile, disabled],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFile(selected);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
        ${isDragging ? 'border-brand bg-brand/10 scale-[1.01]' : 'border-border hover:border-brand/50 hover:bg-card-hover'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${file ? 'border-green-500/50 bg-green-500/5' : ''}
        ${className}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        {file ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{formatBytes(file.size)}</p>
            </div>
            <p className="text-xs text-gray-500">Cliquer pour changer</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-gray-400 mt-1">Glisser-déposer ou cliquer · MP4, MOV</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
