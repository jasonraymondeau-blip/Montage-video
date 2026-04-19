import type { TranscriptSegment, VideoSegment, VideoMetadata, SubtitleLine } from '@/types';

/**
 * Scores and selects the best video segments to fill a target duration.
 * Scoring factors: speech content, keyword density, non-silence, position (hook bonus).
 */
export function selectSegments(
  transcript: TranscriptSegment[],
  silenceRanges: [number, number][],
  metadata: VideoMetadata,
  targetDuration: number,
  cutInterval: number,
): { segments: VideoSegment[]; subtitleLines: SubtitleLine[] } {
  const allSegments = buildScoredSegments(
    transcript,
    silenceRanges,
    metadata.duration,
    cutInterval,
  );

  const selected = greedySelectSegments(allSegments, targetDuration);
  const subtitleLines = buildSubtitleLines(transcript, selected);

  return { segments: selected, subtitleLines };
}

function buildScoredSegments(
  transcript: TranscriptSegment[],
  silenceRanges: [number, number][],
  videoDuration: number,
  cutInterval: number,
): VideoSegment[] {
  const segments: VideoSegment[] = [];

  // Build speech segments from transcript
  for (const seg of transcript) {
    const duration = seg.end - seg.start;
    if (duration < 0.5) continue; // Too short

    let score = 0;

    // Base score for speech
    score += 0.4;

    // Keyword density bonus
    const keywordCount = seg.words.filter((w) => w.isKeyword).length;
    const keywordDensity = seg.words.length > 0 ? keywordCount / seg.words.length : 0;
    score += keywordDensity * 0.3;

    // Hook bonus: first 10 seconds get priority
    if (seg.start < 10) score += 0.25;

    // Penalty for silence
    const isInSilence = silenceRanges.some(
      ([s, e]) => seg.start >= s - 0.1 && seg.end <= e + 0.1,
    );
    if (isInSilence) score -= 0.5;

    // Clip to cutInterval duration
    const clipEnd = Math.min(seg.end, seg.start + cutInterval * 1.5);

    segments.push({
      start: Math.max(0, seg.start - 0.1),
      end: Math.min(videoDuration, clipEnd + 0.1),
      score: Math.max(0, Math.min(1, score)),
      type: 'speech',
    });
  }

  // Fill gaps with "action" segments (non-speech, non-silence)
  if (segments.length === 0) {
    // No transcript — create evenly spaced segments
    let t = 0;
    while (t + cutInterval <= videoDuration) {
      segments.push({
        start: t,
        end: Math.min(t + cutInterval, videoDuration),
        score: 0.5,
        type: 'action',
      });
      t += cutInterval;
    }
  }

  return segments.sort((a, b) => b.score - a.score);
}

function greedySelectSegments(
  scored: VideoSegment[],
  targetDuration: number,
): VideoSegment[] {
  const selected: VideoSegment[] = [];
  let totalDuration = 0;

  // Always try to include the highest-scored segment from the first 10s (hook)
  const hookCandidates = scored.filter((s) => s.start < 10);
  if (hookCandidates.length > 0) {
    const hook = hookCandidates[0];
    selected.push({ ...hook, style: 'hook' } as VideoSegment & { style: string });
    totalDuration += hook.end - hook.start;
  }

  // Greedily pick remaining high-score segments
  for (const seg of scored) {
    if (totalDuration >= targetDuration) break;

    // Skip if overlaps with already selected
    const overlaps = selected.some(
      (s) => seg.start < s.end + 0.1 && seg.end > s.start - 0.1,
    );
    if (overlaps) continue;

    selected.push(seg);
    totalDuration += seg.end - seg.start;
  }

  // Sort by start time for chronological order
  return selected.sort((a, b) => a.start - b.start);
}

function buildSubtitleLines(
  transcript: TranscriptSegment[],
  selected: VideoSegment[],
): SubtitleLine[] {
  if (transcript.length === 0) return [];

  const subtitleLines: SubtitleLine[] = [];
  let timeOffset = 0;

  for (const seg of selected) {
    const transcriptSeg = transcript.find(
      (t) => t.start <= seg.start + 0.5 && t.end >= seg.start - 0.5,
    );

    if (!transcriptSeg) {
      timeOffset += seg.end - seg.start;
      continue;
    }

    const segDuration = seg.end - seg.start;
    const highlightWords = transcriptSeg.words
      .filter((w) => w.isKeyword)
      .map((w) => w.word);

    subtitleLines.push({
      start: timeOffset,
      end: timeOffset + segDuration,
      text: transcriptSeg.text,
      highlightWords,
      style: timeOffset < 5 ? 'hook' : highlightWords.length > 0 ? 'highlight' : 'normal',
    });

    timeOffset += segDuration;
  }

  return subtitleLines;
}
