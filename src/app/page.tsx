'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UploadZone from '@/components/UploadZone';
import ReferenceUploader from '@/components/ReferenceUploader';
import StyleSelector from '@/components/StyleSelector';
import type { TemplateId } from '@/types';

type UploadState = 'idle' | 'uploading' | 'error';

export default function HomePage() {
  const router = useRouter();

  const [mainVideo, setMainVideo] = useState<File | null>(null);
  const [refVideos, setRefVideos] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('tiktok');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleAddRef = useCallback((file: File) => {
    setRefVideos((prev) => [...prev, file]);
  }, []);

  const handleRemoveRef = useCallback((index: number) => {
    setRefVideos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerate = async () => {
    if (!mainVideo) return;

    setError(null);
    setUploadState('uploading');
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('mainVideo', mainVideo);
    refVideos.forEach((file, i) => {
      formData.append(`ref_${i}`, file);
    });
    formData.append('template', selectedTemplate);

    try {
      setUploadProgress(30);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur lors de l\'upload');
      }

      const { jobId } = await res.json();
      setUploadProgress(100);

      router.push(`/job/${jobId}?template=${selectedTemplate}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUploadState('error');
      setUploadProgress(0);
    }
  };

  const isLoading = uploadState === 'uploading';

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-white">ReelForge</span>
          <span className="text-xs bg-brand/20 text-brand-light rounded-full px-2 py-0.5 ml-1">Beta</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-xs text-brand-light font-medium">Propulsé par IA + FFmpeg</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Crée ton Reel viral<br />
            <span className="text-brand">en quelques clics</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Upload ta vidéo brute, choisis un style, et laisse l&apos;IA générer un montage
            optimisé pour Instagram avec coupes, zooms et sous-titres automatiques.
          </p>
        </div>

        {/* Main form */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left column: uploads */}
          <div className="space-y-6 animate-slide-up">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">
                  1. Ta vidéo principale
                </h2>
                <p className="text-xs text-gray-400">La vidéo brute que tu veux transformer</p>
              </div>
              <UploadZone
                label="Glisser ta vidéo principale ici"
                onFile={setMainVideo}
                file={mainVideo}
                disabled={isLoading}
                className="min-h-[140px]"
              />

              <hr className="border-border" />

              <ReferenceUploader
                files={refVideos}
                onAdd={handleAddRef}
                onRemove={handleRemoveRef}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Right column: style + generate */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-white mb-1">
                  2. Style de montage
                </h2>
                <p className="text-xs text-gray-400">Définit le rythme, les effets et l&apos;ambiance</p>
              </div>
              <StyleSelector
                selected={selectedTemplate}
                onChange={setSelectedTemplate}
                disabled={isLoading}
                hasReferences={refVideos.length > 0}
              />
            </div>

            {/* How it works */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Comment ça marche</h3>
              <div className="space-y-3">
                {[
                  { icon: '🔍', text: 'L\'IA analyse ta vidéo et détecte les meilleurs moments' },
                  { icon: '✂️', text: 'Le moteur coupe, zoome et synchronise selon le style choisi' },
                  { icon: '📝', text: 'Les sous-titres sont générés et stylisés automatiquement' },
                  { icon: '📱', text: 'Export MP4 vertical 9:16 optimisé pour Instagram' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex gap-3">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Upload progress */}
        {isLoading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-6 bg-card border border-border rounded-xl px-4 py-3">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Upload en cours...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={!mainVideo || isLoading}
            className={`
              flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200
              ${!mainVideo || isLoading
                ? 'bg-border text-gray-500 cursor-not-allowed'
                : 'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/25 hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Générer mon Reel
              </>
            )}
          </button>
        </div>

        {!mainVideo && (
          <p className="text-center text-xs text-gray-600 mt-3">
            Upload ta vidéo principale pour commencer
          </p>
        )}
      </div>
    </main>
  );
}
