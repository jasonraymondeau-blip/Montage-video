import type { TranscriptSegment, TranscriptWord } from '@/types';

// Common keywords that indicate important/viral moments
const KEYWORD_INDICATORS = [
  'secret', 'never', 'always', 'best', 'worst', 'incredible', 'amazing', 'shocking',
  'truth', 'lie', 'money', 'success', 'fail', 'win', 'lose', 'free', 'learn',
  'change', 'life', 'stop', 'start', 'now', 'today', 'first', 'last', 'only',
  'every', 'must', 'need', 'want', 'why', 'how', 'what', 'secret',
];

function isKeyword(word: string): boolean {
  return KEYWORD_INDICATORS.includes(word.toLowerCase().replace(/[.,!?;:]/g, ''));
}

/**
 * Real Whisper transcription via OpenAI API.
 * Falls back to mock if OPENAI_API_KEY is not set.
 */
export async function transcribeAudio(
  audioPath: string,
  _jobDuration: number,
): Promise<TranscriptSegment[]> {
  if (process.env.OPENAI_API_KEY) {
    return transcribeWithWhisper(audioPath);
  }
  return mockTranscription(_jobDuration);
}

async function transcribeWithWhisper(audioPath: string): Promise<TranscriptSegment[]> {
  const fs = await import('fs');
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment', 'word'],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = response as any;
  const rawSegments = data.segments ?? [];
  const rawWords = data.words ?? [];

  return rawSegments.map(
    (seg: { start: number; end: number; text: string }, segIdx: number) => {
      // Find words that fall within this segment
      const segWords: TranscriptWord[] = rawWords
        .filter((w: { start: number }) => w.start >= seg.start && w.start < seg.end)
        .map((w: { word: string; start: number; end: number }) => ({
          word: w.word.trim(),
          start: w.start,
          end: w.end,
          isKeyword: isKeyword(w.word),
        }));

      // If no word-level timestamps, split text evenly
      if (segWords.length === 0) {
        const words = seg.text.trim().split(/\s+/);
        const duration = seg.end - seg.start;
        const wordDur = duration / words.length;
        segWords.push(
          ...words.map((word, i) => ({
            word,
            start: seg.start + i * wordDur,
            end: seg.start + (i + 1) * wordDur,
            isKeyword: isKeyword(word),
          })),
        );
      }

      return {
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
        words: segWords,
        _segIdx: segIdx,
      };
    },
  );
}

/**
 * Mock transcription: generates plausible-looking segments based on video duration.
 * Used when OPENAI_API_KEY is not set.
 */
function mockTranscription(duration: number): TranscriptSegment[] {
  const samplePhrases = [
    "Voici quelque chose que tu dois absolument savoir",
    "La plupart des gens font cette erreur",
    "Et voilà pourquoi ça change tout",
    "Je vais te montrer exactement comment faire",
    "C'est incroyable de voir les résultats",
    "Tu ne croiras pas ce qui s'est passé ensuite",
    "Le secret que personne ne te dit",
    "Regarde bien ce moment",
    "C'est la méthode la plus efficace",
    "Voilà le résultat final",
  ];

  const segments: TranscriptSegment[] = [];
  let currentTime = 0;
  let phraseIndex = 0;

  while (currentTime < duration - 2) {
    const segDuration = 2.5 + Math.random() * 2;
    const end = Math.min(currentTime + segDuration, duration);
    const text = samplePhrases[phraseIndex % samplePhrases.length];
    const words = text.split(' ');
    const wordDur = (end - currentTime) / words.length;

    segments.push({
      start: currentTime,
      end,
      text,
      words: words.map((word, i) => ({
        word,
        start: currentTime + i * wordDur,
        end: currentTime + (i + 1) * wordDur,
        isKeyword: isKeyword(word),
      })),
    });

    currentTime = end + 0.1 + Math.random() * 0.5;
    phraseIndex++;
  }

  return segments;
}
