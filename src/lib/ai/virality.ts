import type { ViralityResult, ViralityBreakdown } from '@/types';

interface ViralityParams {
  clipCount: number;
  duration: number;
  hasHook: boolean;
  hasSubtitles: boolean;
  zoomCount: number;
  transition: string;
  template: string;
}

const GRADE_THRESHOLDS: [number, ViralityResult['grade']][] = [
  [90, 'S'],
  [80, 'A'],
  [65, 'B'],
  [50, 'C'],
  [35, 'D'],
  [0, 'F'],
];

const VIRALITY_TIPS: Record<string, string> = {
  lowCutRate: 'Augmente le nombre de coupes — les Reels viraux coupent toutes les 1-3 secondes',
  tooLong: 'Raccourcis ta vidéo à 15-30 secondes pour maximiser l\'engagement',
  tooShort: 'Ajoute plus de contenu — 20+ secondes améliore la rétention',
  noHook: 'Ajoute un hook percutant dans les 3 premières secondes',
  noSubtitles: '85% des Reels sont regardés sans son — ajoute des sous-titres',
  noZoom: 'Les effets de zoom dynamiques augmentent l\'engagement de 20%',
};

export function computeViralityScore(params: ViralityParams): ViralityResult {
  const { clipCount, duration, hasHook, hasSubtitles, zoomCount, transition } = params;

  // Cut rate score (0-20pts): ideal range 0.3-1.0 cuts/sec
  const cutRate = clipCount / Math.max(duration, 1);
  let cutRateScore = 0;
  if (cutRate >= 0.3 && cutRate <= 1.0) cutRateScore = 20;
  else if (cutRate > 0.1 && cutRate < 0.3) cutRateScore = 10;
  else if (cutRate > 1.0) cutRateScore = 15;

  // Duration score (0-15pts): ideal 15-45 seconds
  let durationScore = 0;
  if (duration >= 15 && duration <= 30) durationScore = 15;
  else if (duration > 30 && duration <= 45) durationScore = 12;
  else if (duration > 45 && duration <= 60) durationScore = 8;
  else if (duration > 5 && duration < 15) durationScore = 5;

  // Hook score (0-15pts)
  const hookScore = hasHook ? 15 : 0;

  // Subtitle score (0-15pts)
  const subtitleScore = hasSubtitles ? 15 : 0;

  // Zoom effects score (0-10pts)
  let zoomScore = 0;
  if (zoomCount > 0) zoomScore = Math.min(10, zoomCount * 3);

  // Clip variety score (0-10pts): more clips = more variety
  const varietyScore = Math.min(10, clipCount * 1.5);

  // Audio sync score (0-15pts): non-cut transitions suggest rhythm awareness
  const audioSyncScore = transition !== 'cut' ? 12 : 8;

  const breakdown: ViralityBreakdown = {
    cutRate: Math.round(cutRateScore),
    duration: Math.round(durationScore),
    hook: hookScore,
    subtitles: subtitleScore,
    zoomEffects: Math.round(zoomScore),
    clipVariety: Math.round(varietyScore),
    audioSync: audioSyncScore,
  };

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Math.min(100, Math.round(total));

  const grade = GRADE_THRESHOLDS.find(([threshold]) => score >= threshold)?.[1] ?? 'F';

  const tips: string[] = [];
  if (cutRate < 0.3) tips.push(VIRALITY_TIPS.lowCutRate);
  if (duration > 60) tips.push(VIRALITY_TIPS.tooLong);
  if (duration < 10) tips.push(VIRALITY_TIPS.tooShort);
  if (!hasHook) tips.push(VIRALITY_TIPS.noHook);
  if (!hasSubtitles) tips.push(VIRALITY_TIPS.noSubtitles);
  if (zoomCount === 0) tips.push(VIRALITY_TIPS.noZoom);

  return { score, grade, breakdown, tips };
}
