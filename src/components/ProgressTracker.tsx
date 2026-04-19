'use client';

import type { JobStep, JobStatus } from '@/types';

interface ProgressTrackerProps {
  steps: JobStep[];
  status: JobStatus;
}

const STATUS_LABELS: Record<JobStatus, string> = {
  uploaded: 'Vidéo uploadée',
  analyzing: 'Analyse en cours...',
  analyzed: 'Analyse terminée',
  generating: 'Génération en cours...',
  complete: 'Montage prêt !',
  error: 'Erreur',
};

export default function ProgressTracker({ steps, status }: ProgressTrackerProps) {
  const overallProgress = computeOverallProgress(steps, status);

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-white">{STATUS_LABELS[status]}</span>
          <span className="text-sm text-gray-400">{overallProgress}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out
              ${status === 'error' ? 'bg-red-500' : status === 'complete' ? 'bg-green-500' : 'bg-brand'}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <StepRow key={i} step={step} />
        ))}
      </div>
    </div>
  );
}

function StepRow({ step }: { step: JobStep }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <StepIcon status={step.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium
            ${step.status === 'done' ? 'text-green-400' : ''}
            ${step.status === 'running' ? 'text-white' : ''}
            ${step.status === 'pending' ? 'text-gray-500' : ''}
            ${step.status === 'error' ? 'text-red-400' : ''}
          `}>
            {step.name}
          </span>
          {step.status === 'running' && step.progress > 0 && (
            <span className="text-xs text-gray-400">{step.progress}%</span>
          )}
        </div>
        {step.status === 'running' && (
          <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand/60 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, step.progress)}%` }}
            />
          </div>
        )}
        {step.message && step.status !== 'pending' && (
          <p className="text-xs text-gray-500 mt-0.5">{step.message}</p>
        )}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: JobStep['status'] }) {
  if (status === 'done') {
    return (
      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-5 h-5 rounded-full border border-border bg-card flex-shrink-0 mt-0.5" />
  );
}

function computeOverallProgress(steps: JobStep[], status: JobStatus): number {
  if (status === 'uploaded') return 5;
  if (status === 'complete') return 100;
  if (status === 'error') return 0;

  const done = steps.filter((s) => s.status === 'done').length;
  const running = steps.find((s) => s.status === 'running');
  const total = steps.length;

  const base = (done / total) * 100;
  const bonus = running ? (running.progress / total) : 0;
  return Math.min(99, Math.round(base + bonus));
}
