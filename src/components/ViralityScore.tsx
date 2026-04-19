'use client';

import type { ViralityResult } from '@/types';

interface ViralityScoreProps {
  result: ViralityResult;
}

const GRADE_COLORS: Record<ViralityResult['grade'], string> = {
  S: 'text-yellow-400',
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-brand-light',
  D: 'text-orange-400',
  F: 'text-red-400',
};

const GRADE_BG: Record<ViralityResult['grade'], string> = {
  S: 'bg-yellow-400/10 border-yellow-400/30',
  A: 'bg-green-400/10 border-green-400/30',
  B: 'bg-blue-400/10 border-blue-400/30',
  C: 'bg-brand/10 border-brand/30',
  D: 'bg-orange-400/10 border-orange-400/30',
  F: 'bg-red-400/10 border-red-400/30',
};

const BREAKDOWN_LABELS: Record<string, string> = {
  cutRate: 'Fréquence des coupes',
  duration: 'Durée optimale',
  hook: 'Hook d\'accroche',
  subtitles: 'Sous-titres',
  zoomEffects: 'Effets zoom',
  clipVariety: 'Variété des clips',
  audioSync: 'Synchronisation audio',
};

const BREAKDOWN_MAX: Record<string, number> = {
  cutRate: 20,
  duration: 15,
  hook: 15,
  subtitles: 15,
  zoomEffects: 10,
  clipVariety: 10,
  audioSync: 15,
};

export default function ViralityScore({ result }: ViralityScoreProps) {
  const { score, grade, breakdown, tips } = result;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Score de viralité</h3>
          <p className="text-xs text-gray-400 mt-0.5">Estimation de l'engagement potentiel</p>
        </div>
        <div className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center ${GRADE_BG[grade]}`}>
          <span className={`text-xl font-black ${GRADE_COLORS[grade]}`}>{grade}</span>
          <span className="text-xs text-gray-400">{score}/100</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            score >= 80 ? 'bg-green-500' :
            score >= 60 ? 'bg-blue-500' :
            score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        {Object.entries(breakdown).map(([key, value]) => (
          <BreakdownRow
            key={key}
            label={BREAKDOWN_LABELS[key] ?? key}
            value={value}
            max={BREAKDOWN_MAX[key] ?? 20}
          />
        ))}
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs font-medium text-gray-400">Conseils pour améliorer :</p>
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-yellow-400 text-xs flex-shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    pct >= 80 ? 'bg-green-500' :
    pct >= 50 ? 'bg-brand' :
    pct >= 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}
