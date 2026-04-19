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

  type AnyObj = Record<string, unknown>;
  const data = response as unknown as AnyObj;
  const rawSegments = (data.segments as AnyObj[] | undefined) ?? [];
  const rawWords = (data.words as AnyObj[] | undefined) ?? [];

  return rawSegments.map(
    (seg: AnyObj, segIdx: number) => {
      const segStart = seg.start as number;
      const segEnd = seg.end as number;
      const segText = (seg.text as string).trim();

      const segWords: TranscriptWord[] = rawWords
        .filter((w: AnyObj) => (w.start as number) >= segStart && (w.start as number) < segEnd)
        .map((w: AnyObj) => ({
          word: (w.word as string).trim(),
          start: w.start as number,
          end: w.end as number,
          isKeyword: isKeyword(w.word as string),
        }));

      // If no word-level timestamps, split text evenly
      if (segWords.length === 0) {
        const words = segText.split(/\s+/);
        const duration = segEnd - segStart;
        const wordDur = duration / words.length;
        segWords.push(
          ...words.map((word, i) => ({
            word,
            start: segStart + i * wordDur,
            end: segStart + (i + 1) * wordDur,
            isKeyword: isKeyword(word),
          })),
        );
      }

      void segIdx;
      return {
        start: segStart,
        end: segEnd,
        text: segText,
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
