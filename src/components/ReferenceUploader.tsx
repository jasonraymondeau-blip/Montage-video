'use client';

import { useRef, useState } from 'react';

interface ReferenceUploaderProps {
  files: File[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function ReferenceUploader({
  files,
  onAdd,
  onRemove,
  disabled = false,
  maxFiles = 5,
}: ReferenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const remaining = maxFiles - files.length;
    Array.from(incoming).slice(0, remaining).forEach((f) => {
      if (f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|avi|mkv)$/i)) {
        onAdd(f);
      }
    });
  };

  const formatBytes = (bytes: number) =>
    `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Vidéos de référence</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Optionnel · Le style sera appris depuis ces vidéos ({files.length}/{maxFiles})
          </p>
        </div>
        {files.length < maxFiles && (
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled}
            className="text-xs text-brand-light hover:text-brand transition-colors disabled:opacity-50"
          >
            + Ajouter
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={disabled}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {files.length < maxFiles && (
            <button
              type="button"
              onClick={() => !disabled && inputRef.current?.click()}
              disabled={disabled}
              className="w-full py-2 rounded-xl border border-dashed border-border text-xs text-gray-500 hover:border-brand/50 hover:text-brand-light transition-colors disabled:opacity-50"
            >
              + Ajouter une référence ({files.length}/{maxFiles})
            </button>
          )}
        </div>
      ) : (
        <div
          className={`rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${isDragging ? 'border-brand/50 bg-brand/5' : 'border-border hover:border-brand/30'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <div className="py-6 text-center">
            <p className="text-xs text-gray-500">
              Glisser des vidéos de référence ici ou{' '}
              <span className="text-brand-light">cliquer pour parcourir</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">Sans référence, le template choisi sera utilisé</p>
          </div>
        </div>
      )}
    </div>
  );
}
