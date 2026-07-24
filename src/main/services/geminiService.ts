import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// The "-latest" aliases track the current GA model, avoiding hardcoded ids that get retired.
// `gemini-pro-latest` currently resolves to a paid-tier-only model (gemini-3.1-pro), so the
// default think model is pinned to a free-tier-eligible one.
const DEFAULT_TRANSCRIBE_MODEL = 'gemini-flash-latest';
const DEFAULT_FAST_MODEL = 'gemini-flash-lite-latest';
const DEFAULT_THINK_MODEL = 'gemini-2.5-flash';

let client: GoogleGenAI | null = null;

function getClient(apiKey?: string): GoogleGenAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('No Gemini API key configured. Add one in Settings or set GEMINI_API_KEY.');
  }
  if (!client || (client as unknown as { __key?: string }).__key !== key) {
    client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    (client as unknown as { __key?: string }).__key = key;
  }
  return client;
}

export type GeminiModel = { id: string; displayName: string; description?: string };

export async function listModels(apiKey?: string): Promise<GeminiModel[]> {
  const ai = getClient(apiKey);
  const pager = await ai.models.list();
  const models: GeminiModel[] = [];

  for await (const model of pager) {
    if (!model.name) continue;
    if (!model.supportedActions?.includes('generateContent')) continue;
    // The API returns fully qualified names like "models/gemini-2.5-flash".
    const id = model.name.replace(/^models\//, '');
    models.push({ id, displayName: model.displayName || id, description: model.description });
  }

  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

export async function transcribe(args: {
  audioBase64: string;
  mimeType?: string;
  model?: string;
  language?: string;
  apiKey?: string;
  knownSpeakers?: string[];
}): Promise<string> {
  const ai = getClient(args.apiKey);

  const languageHint = args.language
    ? ` The audio is in ${args.language}; write the transcription in that same language.`
    : '';

  // Earlier chunks of the same meeting are transcribed separately, so pass the
  // speaker labels already seen to keep names and numbering consistent.
  const speakerHint = args.knownSpeakers?.length
    ? ` Speakers already identified earlier in this meeting: ${args.knownSpeakers.join(', ')}. ` +
      'Reuse the exact same label whenever the same person speaks again, and continue the ' +
      '"Speaker N" numbering from there for any genuinely new, unnamed speaker.'
    : '';

  const response = await ai.models.generateContent({
    model: args.model || DEFAULT_TRANSCRIBE_MODEL,
    contents: [
      {
        inlineData: {
          data: args.audioBase64,
          mimeType: args.mimeType || 'audio/webm;codecs=opus',
        },
      },
      'Transcribe the audio accurately. Split the transcription into speaker turns and ' +
        'return ONLY a JSON array, with no markdown fence and no commentary, where each item is ' +
        '{"speaker": string, "time": "MM:SS", "text": string}. ' +
        'When a speaker states their own name or is clearly addressed by name in the conversation, ' +
        'use that real name as the "speaker" label and apply it consistently to every turn from that ' +
        'same speaker. Only fall back to "Speaker 1", "Speaker 2", ... for speakers whose name is ' +
        'never revealed. `time` is the start offset of the turn from the beginning of the audio.' +
        speakerHint +
        languageHint,
    ],
  });

  return response.text ?? '';
}

export async function chatFast(args: {
  prompt: string;
  model?: string;
  apiKey?: string;
}): Promise<string> {
  const ai = getClient(args.apiKey);
  const response = await ai.models.generateContent({
    model: args.model || DEFAULT_FAST_MODEL,
    contents: args.prompt,
  });
  return response.text ?? '';
}

export async function chatThink(args: {
  prompt: string;
  model?: string;
  apiKey?: string;
}): Promise<string> {
  const ai = getClient(args.apiKey);
  const response = await ai.models.generateContent({
    model: args.model || DEFAULT_THINK_MODEL,
    contents: args.prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });
  return response.text ?? '';
}
