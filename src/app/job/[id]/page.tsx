'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProgressTracker from '@/components/ProgressTracker';
import VideoPlayer from '@/components/VideoPlayer';
import ViralityScore from '@/components/ViralityScore';
import type { JobStatusResponse, TemplateId, GenerateRequest } from '@/types';

const POLL_INTERVAL = 2000;

type PagePhase = 'analyzing' | 'ready-to-generate' | 'generating' | 'complete' | 'error';

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTemplate = (searchParams.get('template') as TemplateId) ?? 'tiktok';

  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [phase, setPhase] = useState<PagePhase>('analyzing');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/job/${id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data: JobStatusResponse = await res.json();
      setJob(data);

      if (data.status === 'analyzed') setPhase('ready-to-generate');
      else if (data.status === 'generating') setPhase('generating');
      else if (data.status === 'complete') setPhase('complete');
      else if (data.status === 'error') setPhase('error');
    } catch {
      // Network error — keep polling
    }
  }, [id]);

  useEffect(() => {
    fetchJob();

    const stopStatuses = ['analyzed', 'complete', 'error'];
    let stopped = false;

    const poll = setInterval(async () => {
      if (stopped) return;
      await fetchJob();
      if (job && stopStatuses.includes(job.status)) {
        stopped = true;
        clearInterval(poll);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(poll);
  }, [fetchJob]);

  // Auto-trigger generation once analysis is done
  useEffect(() => {
    if (phase === 'ready-to-generate' && !isGenerating) {
      triggerGeneration(initialTemplate);
    }
  }, [phase]);

  const triggerGeneration = async (template: TemplateId) => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const body: GenerateRequest = { template, targetDuration: 30 };
      const res = await fetch(`/api/generate/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur lors du démarrage de la génération');
      }

      setPhase('generating');

      // Resume polling for generation progress
      const poll = setInterval(async () => {
        await fetchJob();
        if (job?.status === 'complete' || job?.status === 'error') {
          clearInterval(poll);
        }
      }, POLL_INTERVAL);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Erreur inconnue');
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-white">ReelForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={job?.status ?? 'uploaded'} />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {phase === 'complete' && job?.outputUrl ? (
          <CompleteView job={job} />
        ) : (
          <ProcessingView job={job} phase={phase} error={generateError} />
        )}
      </div>
    </main>
  );
}

function ProcessingView({
  job,
  phase,
  error,
}: {
  job: JobStatusResponse | null;
  phase: PagePhase;
  error: string | null;
}) {
  const phaseMessages: Record<PagePhase, { title: string; subtitle: string }> = {
    analyzing: {
      title: 'Analyse en cours...',
      subtitle: 'L\'IA examine ta vidéo, détecte les moments clés et prépare le montage',
    },
    'ready-to-generate': {
      title: 'Démarrage du montage...',
      subtitle: 'L\'analyse est terminée, génération du montage en cours',
    },
    generating: {
      title: 'Génération du montage...',
      subtitle: 'FFmpeg applique les coupes, les effets et génère les sous-titres',
    },
    complete: { title: '', subtitle: '' },
    error: {
      title: 'Une erreur s\'est produite',
      subtitle: job?.error ?? 'Une erreur inattendue a empêché la génération',
    },
  };

  const { title, subtitle } = phaseMessages[phase];

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        {phase === 'error' ? (
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>

      {job && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <ProgressTracker steps={job.steps} status={job.status} />
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-brand-light hover:text-brand transition-colors"
          >
            ← Recommencer depuis le début
          </Link>
        </div>
      )}
    </div>
  );
}

function CompleteView({ job }: { job: JobStatusResponse }) {
  const handleDownload = async () => {
    if (!job.outputUrl) return;
    const a = document.createElement('a');
    a.href = job.outputUrl;
    a.download = `reel-${job.id}.mp4`;
    a.click();
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Ton Reel est prêt ! 🎉</h1>
        <p className="text-gray-400 text-sm">
          Télécharge-le et publie-le directement sur Instagram Reels
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Video player */}
        <div>
          <VideoPlayer
            src={job.outputUrl!}
            className="max-w-[320px] mx-auto"
          />

          {/* Action buttons */}
          <div className="mt-4 flex flex-col gap-3 max-w-[320px] mx-auto">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-semibold transition-all duration-200 hover:scale-[1.02]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le Reel
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-gray-300 hover:border-brand/50 hover:text-white transition-all duration-200 text-sm"
            >
              Créer un autre montage
            </Link>
          </div>
        </div>

        {/* Right column: virality score + steps */}
        <div className="space-y-4">
          {job.viralityScore && (
            <ViralityScore result={job.viralityScore} />
          )}

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-white mb-4">Détail du traitement</h3>
            <ProgressTracker steps={job.steps} status={job.status} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    uploaded: { label: 'Prêt', color: 'bg-gray-500/20 text-gray-300' },
    analyzing: { label: 'Analyse...', color: 'bg-blue-500/20 text-blue-400' },
    analyzed: { label: 'Analysé', color: 'bg-green-500/20 text-green-400' },
    generating: { label: 'Génération...', color: 'bg-brand/20 text-brand-light' },
    complete: { label: 'Terminé', color: 'bg-green-500/20 text-green-400' },
    error: { label: 'Erreur', color: 'bg-red-500/20 text-red-400' },
  };

  const { label, color } = config[status] ?? config.uploaded;

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${color}`}>
      {label}
    </span>
  );
}
