import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env.local");
const distDir = path.join(projectRoot, "dist");
const generatedDir = path.join(projectRoot, "generated");
const dataDir = path.join(projectRoot, "server", "data");
const usagePath = path.join(dataDir, "usage.json");
const demoManifestPath = path.join(projectRoot, "public", "demo", "tracks.json");

await loadLocalEnv();
await mkdir(generatedDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

function isPlaceholderValue(value) {
  return /^(replace_with_|your_|example_|demo_)/i.test(String(value || "").trim());
}

const provider = resolveProvider(process.env.MUSIC_PROVIDER || "acemusic-api");
const isProductionRuntime = process.env.NODE_ENV === "production";
const bindHost = process.env.LOCAL_BIND_HOST || (isProductionRuntime ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT || process.env.LOCAL_API_PORT || 4000);
const dailyLimit = parseDailyLimit(process.env.LOCAL_DAILY_LIMIT);
const allowedOrigins = (process.env.LOCAL_ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const demoOnlyMode = parseBooleanEnv(process.env.DEPLOY_DEMO_ONLY);

const acemusicApiBaseUrl = (process.env.ACEMUSIC_API_BASE_URL || "https://api.acemusic.ai").replace(
  /\/$/,
  ""
);
const acemusicApiKey = isPlaceholderValue(process.env.ACEMUSIC_API_KEY) ? "" : process.env.ACEMUSIC_API_KEY || "";
const acemusicModel = process.env.ACEMUSIC_MODEL || "acemusic/acestep-v15-turbo";
const acemusicRequestTimeoutMs = parsePositiveIntegerEnv(process.env.ACEMUSIC_REQUEST_TIMEOUT_MS, 240000);
const acemusicAudioTimeoutMs = parsePositiveIntegerEnv(process.env.ACEMUSIC_AUDIO_TIMEOUT_MS, 120000);

const providerCatalog = {
  "acemusic-api": {
    label: "ACEMusic hosted API"
  }
};

function resolveProvider(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "acemusic-api") {
    return normalized;
  }

  return "acemusic-api";
}

function parseBooleanEnv(value) {
  return /^(1|true|yes|on)$/i.test(String(value || ""));
}

function parseDailyLimit(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function parsePositiveIntegerEnv(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function errorStack(error) {
  return error instanceof Error ? error.stack : "";
}

function publicStatusCode(error, fallback = 500) {
  const statusCode = error && typeof error.statusCode === "number" ? error.statusCode : fallback;

  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    return fallback;
  }

  return statusCode;
}

function createUpstreamError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

function logRuntimeEvent(event, details = {}) {
  console.log(`[yumi] ${event} ${JSON.stringify(details)}`);
}

function logRuntimeError(event, error, details = {}) {
  console.error(
    `[yumi] ${event} ${JSON.stringify({
      ...details,
      message: errorMessage(error),
      stack: errorStack(error)
    })}`
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs, errorPrefix) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createUpstreamError(`${errorPrefix} timed out after ${timeoutMs}ms`, {
        statusCode: 504,
        phase: "provider-timeout"
      });
    }

    throw createUpstreamError(`${errorPrefix}: ${errorMessage(error)}`, {
      statusCode: 502,
      phase: "provider-network"
    });
  } finally {
    clearTimeout(timeout);
  }
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function loadLocalEnv() {
  if (!existsSync(envPath)) {
    return;
  }

  const content = await readFile(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function corsHeaders(origin) {
  if (!origin || !allowedOrigins.includes(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin"
  };
}

function isSameHostOrigin(origin, request) {
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim();
    const requestHost = forwardedHost || request.headers.host || "";
    return Boolean(requestHost && originHost === requestHost);
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin, request) {
  return !origin || allowedOrigins.includes(origin) || isSameHostOrigin(origin, request);
}

function sendJson(response, statusCode, body, origin) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(origin)
  });
  response.end(JSON.stringify(body, null, 2));
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

async function readUsage() {
  try {
    const stored = JSON.parse(await readFile(usagePath, "utf8"));
    const date = todayKey();

    if (stored.date === date) {
      return stored;
    }
  } catch {
    // Missing or malformed usage state starts a fresh local day.
  }

  return { date: todayKey(), count: 0 };
}

async function writeUsage(usage) {
  await writeFile(usagePath, JSON.stringify(usage, null, 2));
}

function usagePayload(usage) {
  return {
    date: usage.date,
    count: usage.count,
    limit: dailyLimit,
    provider,
    purpose: dailyLimit ? "로컬 컴퓨터 보호용 생성 한도" : "무료 ACEMusic 사용 기록"
  };
}

function localApiBase() {
  const displayHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;
  return `http://${displayHost}:${port}`;
}

function publicBaseUrlFromRequest(request) {
  const configuredBase = (process.env.PUBLIC_APP_BASE_URL || process.env.PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (configuredBase) {
    return configuredBase;
  }

  const forwardedHost = String(request.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || request.headers.host || `127.0.0.1:${port}`;
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol =
    forwardedProto || (/^(localhost|127\.|0\.0\.0\.0)/.test(host) ? "http" : "https");

  return `${protocol}://${host}`;
}

function safeFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const creativeTitleSeeds = [
  "Moon and the Sharks",
  "Midnight Air Glitch",
  "Paper Summer",
  "Glass Orchard",
  "Neon Rain Letters",
  "Velvet Bus Stop",
  "Blue Hour Static",
  "Soft Exit",
  "Last Train Bloom",
  "Saltwater Signal",
  "Clouds in Stereo",
  "Cherry Static"
];

const creativeTitleRules = [
  {
    pattern: /moon|달|shark|상어|swim|수영|dive|water|바다|ocean|sea|파도/i,
    titles: ["Saltwater Signal", "Blue Tide Letter", "Dive at Midnight", "Moonlit Undertow"]
  },
  {
    pattern: /midnight|night|밤|새벽|walk|산책|street|거리|home|집/i,
    titles: ["Midnight Air Glitch", "Last Train Bloom", "Velvet Bus Stop", "Streetlights After Two"]
  },
  {
    pattern: /job|quit|office|work|boss|회사|퇴근|일|사표/i,
    titles: ["Soft Exit", "Exit Interview", "Last Day Parade", "Desk Light Freedom"]
  },
  {
    pattern: /late|jess|기다|늦|delay|missed/i,
    titles: ["Jess Is Late Again", "Three Minutes Late", "Waiting Room Weather", "Late Train Polaroid"]
  },
  {
    pattern: /rain|비|neon|네온|city|도시|train|기차|subway|지하철/i,
    titles: ["Neon Rain Letters", "Blue Hour Static", "Glass Station", "Subway Weather"]
  },
  {
    pattern: /again|start|restart|다시|시작|처음|begin|hope|희망/i,
    titles: ["Paper Summer", "First Light Again", "Begin Again Bloom", "Tomorrow in Stereo"]
  },
  {
    pattern: /love|romance|heart|사랑|설렘|flutter|kiss/i,
    titles: ["Glass Orchard", "Soft Heart Static", "Cherry Static", "Velvet Confession"]
  }
];

const titleStopWords = new Set([
  "make",
  "song",
  "about",
  "with",
  "after",
  "before",
  "being",
  "want",
  "imagine",
  "korean",
  "english",
  "verse",
  "hook",
  "kpop",
  "pop",
  "music",
  "style",
  "vocal"
]);

function hashString(value) {
  return Array.from(String(value || "")).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    17
  );
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeInput(rawInput = {}) {
  return {
    mood: String(rawInput.mood || "").trim(),
    genres: normalizeArray(rawInput.genres),
    artists: normalizeArray(rawInput.artists),
    styleDescription: String(rawInput.styleDescription || "").trim(),
    lyricsOrIdea: String(rawInput.lyricsOrIdea || "").trim(),
    vocalTone: String(rawInput.vocalTone || "").trim(),
    soundDetails: String(rawInput.soundDetails || "").trim(),
    duration: String(rawInput.duration || "").trim(),
    titleMode: String(rawInput.titleMode || "auto").trim() === "custom" ? "custom" : "auto",
    customTitle: String(rawInput.customTitle || "").trim()
  };
}

function hasMeaningfulInput(input) {
  return Boolean(
    input.mood ||
      input.genres.length > 0 ||
      input.artists.length > 0 ||
      input.styleDescription ||
      input.lyricsOrIdea ||
      input.vocalTone ||
      input.soundDetails
  );
}

function parseDuration(value) {
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return 120;
  }

  const amount = Number(match[1].replace(",", "."));

  if (!Number.isFinite(amount) || amount <= 0) {
    return 120;
  }

  let seconds = amount;

  if (/시간|hour|hours|hr|hrs/.test(text)) {
    seconds = amount * 3600;
  } else if (/분|min|mins|minute|minutes/.test(text)) {
    seconds = amount * 60;
  } else if (/초|sec|secs|second|seconds/.test(text)) {
    seconds = amount;
  } else if (amount <= 10) {
    seconds = amount * 60;
  }

  if (seconds < 30) {
    return 30;
  }

  if (seconds > 180) {
    return 180;
  }

  return Math.round(seconds);
}

function isInstrumental(input) {
  const vocalText = `${input.vocalTone} ${input.soundDetails}`.toLowerCase();
  return /보컬 없이|instrumental|no vocal/.test(vocalText);
}

const moodTranslations = new Map([
  ["행복한", "happy, bright, and uplifting"],
  ["차분한", "calm, serene, and intimate"],
  ["우울한", "melancholic and reflective"],
  ["설레는", "fluttering, dreamy, and excited"],
  ["집중하고 싶은", "focused, steady, and unobtrusive"],
  ["에너지가 필요한", "energetic, punchy, and motivating"]
]);

const phraseTranslations = [
  ["차분한 밤 산책에 어울리는", "perfect for a calm late-night walk"],
  ["따뜻한 로파이 알앤비", "warm lo-fi R&B"],
  ["따뜻한 베이스", "warm bass"],
  ["깨끗한 드럼", "clean drums"],
  ["잔잔한 신스 패드", "gentle synth pad"],
  ["낮게 깔리는 신스", "low soft synth"],
  ["부드러운 남성 보컬", "soft male vocal"],
  ["맑은 여성 보컬", "clear female vocal"],
  ["허스키한 저음", "husky low vocal"],
  ["속삭이듯 가까운 톤", "close whisper-like tone"],
  ["코러스 중심", "chorus-forward vocal arrangement"],
  ["보컬 없이", "instrumental only"],
  ["보컬 없이 인스트루멘털", "instrumental only"],
  ["늦은 밤", "late at night"],
  ["밤 산책", "late-night walk"],
  ["조용한 위로", "quiet comfort"],
  ["다시 시작", "starting again"],
  ["지친 하루 끝에서", "at the end of a tiring day"],
  ["다시 시작하고 싶은 마음", "the desire to start again"],
  ["위로를 담은", "about comfort and encouragement"],
  ["설렘", "fluttering excitement"],
  ["집중", "focus"],
  ["몽환적인", "dreamy"],
  ["차분한", "calm"],
  ["우울한", "melancholic"],
  ["행복한", "happy"],
  ["설레는", "excited"],
  ["에너지가 필요한", "energetic"]
];

function translateMood(value) {
  const trimmed = String(value || "").trim();
  return moodTranslations.get(trimmed) || toAsciiFriendlyText(trimmed, "emotionally clear and focused");
}

function replaceCommonPhrases(value) {
  return phraseTranslations.reduce((accumulator, [source, target]) => {
    return accumulator.split(source).join(target);
  }, String(value || "").trim());
}

function toAsciiFriendlyText(value, fallback) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return fallback;
  }

  const translated = replaceCommonPhrases(trimmed)
    .replace(/[“”‘’"]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!/[가-힣]/.test(translated)) {
    return translated;
  }

  const asciiOnly = translated
    .replace(/[가-힣]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return asciiOnly || fallback;
}

function normalizeMultilineText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const lyricsHeadingPattern = /^(?:#{1,6}\s*)?(?:lyrics|가사)\s*:?\s*$/i;
const inlineLyricsHeadingPattern = /^(?:#{1,6}\s*)?(?:lyrics|가사)\s*:\s*(.+)$/i;
const metadataHeadingPattern =
  /^(?:#{1,6}\s*)?(?:metadata|meta\s*data|메타데이터|request|prompt|audio\s*metadata)\b/i;
const markdownHeadingPattern = /^#{1,6}\s+\S+/;
const generatedTextNoisePattern =
  /ACEMusic|로컬 생성|배포용 데모|배포 버전|공개 배포|Demo manifest|Demo Result|Create one original|Lyrics instruction/i;
const generatedMetadataKeyPattern =
  /^[-*]?\s*["']?(?:metadata|model|mode|request|messages|modalities|provider|source|usage|notice|prompt|audio|audioCodes|audio_config|finishReason|finish_reason|title|mood|genre|genres|vocal|duration|instrumental|sample_mode|temperature|top_p|guidance_scale|task_type)["']?\s*[:={]/i;

function isGeneratedLyricsLine(line) {
  const trimmed = String(line || "").trim();

  if (!trimmed || generatedTextNoisePattern.test(trimmed)) {
    return false;
  }

  if (/^```/.test(trimmed) || markdownHeadingPattern.test(trimmed) || metadataHeadingPattern.test(trimmed)) {
    return false;
  }

  if (generatedMetadataKeyPattern.test(trimmed) || /^[{}[\],]+$/.test(trimmed)) {
    return false;
  }

  return true;
}

function extractGeneratedLyrics(value) {
  const normalized = normalizeMultilineText(value || "");

  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const inlineHeadingIndex = lines.findIndex((line) => inlineLyricsHeadingPattern.test(line));
  const blockHeadingIndex = lines.findIndex((line) => lyricsHeadingPattern.test(line));
  let candidateLines = lines;

  if (inlineHeadingIndex >= 0) {
    const firstLine = lines[inlineHeadingIndex].replace(inlineLyricsHeadingPattern, "$1").trim();
    candidateLines = [firstLine, ...lines.slice(inlineHeadingIndex + 1)];
  } else if (blockHeadingIndex >= 0) {
    candidateLines = lines.slice(blockHeadingIndex + 1);
  } else if (lines.some((line) => metadataHeadingPattern.test(line))) {
    candidateLines = [];
    let skippingMetadata = false;

    for (const line of lines) {
      if (metadataHeadingPattern.test(line)) {
        skippingMetadata = true;
        continue;
      }

      if (markdownHeadingPattern.test(line)) {
        skippingMetadata = false;
      }

      if (!skippingMetadata) {
        candidateLines.push(line);
      }
    }
  }

  const cleanedLines = [];

  for (const line of candidateLines) {
    if (metadataHeadingPattern.test(line)) {
      break;
    }

    if (isGeneratedLyricsLine(line)) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.slice(0, 140).join("\n").trim();
}

function hasHangul(value) {
  return /[가-힣]/.test(String(value || ""));
}

function hasLatinWords(value) {
  return /[A-Za-z]{2,}/.test(String(value || ""));
}

function detectVocalLanguage(input) {
  const text = `${input.lyricsOrIdea} ${input.vocalTone} ${input.styleDescription}`;
  const containsHangul = hasHangul(text);
  const containsLatin = hasLatinWords(text);

  if (containsHangul && containsLatin) {
    return "unknown";
  }

  if (containsHangul) {
    return "ko";
  }

  if (containsLatin) {
    return "en";
  }

  return "unknown";
}

function flattenLiteralLyrics(value) {
  return normalizeMultilineText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" / ");
}

function looksLikeLiteralLyrics(value) {
  const normalized = normalizeMultilineText(value);

  if (!normalized) {
    return false;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return true;
  }

  return /\[(verse|chorus|bridge|intro|outro|pre-chorus)/i.test(normalized);
}

function buildLyricsPromptSection(input) {
  if (isInstrumental(input)) {
    return "Lyrics instruction: keep this fully instrumental with no sung lead.";
  }

  const rawLyricsOrIdea = normalizeMultilineText(input.lyricsOrIdea);
  const literalLyrics = flattenLiteralLyrics(input.lyricsOrIdea);

  if (!literalLyrics) {
    return [
      "Lyrics instruction: write original Korean lyrics that match the requested mood.",
      "Keep Korean lyrics in Hangul, not romanized Korean.",
      "If the user asks for bilingual Korean and English parts, write Korean parts in Hangul and English parts in English.",
      "Never write romanized Korean pronunciation, and never label lyric lines with [ko], [kr], [en], or similar language tags."
    ].join(" ");
  }

  if (looksLikeLiteralLyrics(rawLyricsOrIdea)) {
    return [
      "Lyrics instruction: sing the user's exact mixed-language lyrics in the same order as provided.",
      "Preserve each line's original language exactly: Korean stays in Hangul, English stays in English.",
      "Do not translate, romanize, rewrite, summarize, replace, or change the theme of any lyric line.",
      "Never convert Korean to romanized pronunciation. Do not add [ko], [kr], [en], or any language labels to lyric lines.",
      "Only make the smallest possible adjustment if the melody absolutely requires it.",
      `Exact mixed-language lyrics: ${literalLyrics}.`
    ].join(" ");
  }

  return [
    "Lyrics instruction: the user gave a theme or rough idea, not fixed final lyrics.",
    "Expand it into original singable Korean lyrics while preserving the same meaning and emotional direction.",
    "Keep Korean lines in Hangul, never romanized Korean.",
    "If the idea requests English hooks or bilingual parts, keep English lines in English and Korean lines in Hangul.",
    "Never write romanized Korean pronunciation, and never label lyric lines with [ko], [kr], [en], or similar language tags.",
    `Core lyric idea: ${literalLyrics}.`
  ].join(" ");
}

function buildStructuredPrompt(input) {
  const mood = translateMood(input.mood);
  const genres = input.genres.length > 0 ? input.genres.join(", ") : "contemporary pop";
  const artists = input.artists.length > 0 ? input.artists.join(", ") : "";
  const style = toAsciiFriendlyText(input.styleDescription, "warm modern production with a strong emotional arc");
  const vocal = toAsciiFriendlyText(input.vocalTone, "soft expressive vocal");
  const sound = toAsciiFriendlyText(input.soundDetails, "warm bass, clean drums, soft synth pad");
  const duration = parseDuration(input.duration);
  const instrumental = isInstrumental(input);
  const lyricsSection = buildLyricsPromptSection(input);
  const title = createTitle(input);
  const titleInstruction =
    input.titleMode === "custom" && input.customTitle
      ? `Song title: "${title}". Use this exact track title metadata; do not replace it.`
      : [
          `Working title seed: "${title}".`,
          "Return a short creative song title based on the song idea, mood, genre, lyrics, and sound.",
          "Do not use generic mood/genre labels like '차분한 K-pop', 'K-pop Track', or 'ACEMusic Track'.",
          'If you include text content in the response, put the final title on a clear "Title:" line.'
        ].join(" ");

  return [
    `Create one original ${genres} song for a student project demo.`,
    titleInstruction,
    `Mood direction: ${mood}.`,
    artists
      ? `Reference vibe only: ${artists}. Do not imitate any specific song, topline, or artist identity.`
      : "Reference vibe: original contemporary production.",
    `Style instruction: ${style}.`,
    instrumental
      ? "Vocal instruction: no lead vocal, fully instrumental arrangement."
      : `Vocal instruction: ${vocal}. Keep the voice natural, stable, and clearly sung.`,
    `Sound instruction: ${sound}.`,
    `Duration target: about ${duration} seconds.`,
    lyricsSection,
    'If you include text content in the response, put the actual sung lyrics under a clear "Lyrics:" heading only. Keep metadata, model notes, section labels, stage directions, and request details outside the lyrics section.',
    "Important: make the composition polished, emotionally coherent, memorable, and consistent with the requested mood."
  ].join(" ");
}

function toTitleCase(value) {
  return String(value || "").replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function createTitle(input) {
  if (input.titleMode === "custom" && input.customTitle) {
    return input.customTitle;
  }

  const source = normalizeMultilineText([
    input.lyricsOrIdea,
    input.styleDescription,
    input.soundDetails,
    input.mood,
    input.genres.join(" "),
    input.vocalTone
  ].join(" "));
  const matchedRule = creativeTitleRules.find((rule) => rule.pattern.test(source));

  if (matchedRule) {
    return matchedRule.titles[hashString(source) % matchedRule.titles.length];
  }

  const keywords =
    source
      .toLowerCase()
      .match(/[a-z][a-z'-]{2,}/g)
      ?.filter((word) => !titleStopWords.has(word.replace(/'/g, "")))
      .slice(0, 8) || [];

  if (keywords.length >= 2) {
    const first = keywords[hashString(`${source}:first`) % keywords.length];
    const second = keywords[hashString(`${source}:second`) % keywords.length] || keywords[0];

    if (first !== second) {
      return toTitleCase(`${first} ${second}`);
    }
  }

  return creativeTitleSeeds[hashString(source || input.mood || "yumi") % creativeTitleSeeds.length];
}

function isGenericSongTitle(value) {
  return !value || /데모 트랙|ACEMusic Track|Yumi Sketch|K-pop|차분한|설레는|행복한|우울한/.test(value);
}

function cleanProviderTitleCandidate(value) {
  const title = String(value || "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !title ||
    title.length > 80 ||
    /[\r\n]/.test(title) ||
    generatedTextNoisePattern.test(title) ||
    isGenericSongTitle(title) ||
    /^(lyrics|가사|metadata|request|prompt)\b/i.test(title)
  ) {
    return "";
  }

  return title.replace(/[.。]+$/g, "").trim();
}

function titleFromJsonText(text) {
  const normalized = normalizeMultilineText(text);
  const jsonBlock = normalized.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidates = [jsonBlock, normalized];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);
      const title = cleanProviderTitleCandidate(
        parsed?.title || parsed?.songTitle || parsed?.song_title || parsed?.trackTitle || parsed?.track_title
      );

      if (title) {
        return title;
      }
    } catch {
      // Provider text is usually prose or markdown, so non-JSON is expected.
    }
  }

  return "";
}

function titleFromProviderText(text) {
  const normalized = normalizeMultilineText(text);
  const jsonTitle = titleFromJsonText(normalized);

  if (jsonTitle) {
    return jsonTitle;
  }

  const lines = normalized.split("\n").map((line) => line.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const inlineMatch = line.match(
      /^(?:#{1,6}\s*)?(?:song\s*title|track\s*title|title|곡\s*제목|제목)\s*[:：]\s*(.+)$/i
    );

    if (inlineMatch) {
      const title = cleanProviderTitleCandidate(inlineMatch[1]);

      if (title) {
        return title;
      }
    }

    if (/^(?:#{1,6}\s*)?(?:song\s*title|track\s*title|title|곡\s*제목|제목)\s*$/i.test(line)) {
      const nextLine = lines.slice(index + 1).find(Boolean);
      const title = cleanProviderTitleCandidate(nextLine);

      if (title) {
        return title;
      }
    }
  }

  return "";
}

function titleFromProviderPayload(payload, item) {
  const message = payload?.choices?.[0]?.message;
  const candidates = [
    payload?.title,
    payload?.songTitle,
    payload?.song_title,
    payload?.trackTitle,
    payload?.track_title,
    payload?.name,
    message?.title,
    message?.songTitle,
    message?.song_title,
    message?.trackTitle,
    message?.track_title,
    message?.metadata?.title,
    item?.title,
    item?.songTitle,
    item?.song_title,
    item?.trackTitle,
    item?.track_title,
    item?.name,
    item?.audio_url?.title
  ];

  for (const candidate of candidates) {
    const title = cleanProviderTitleCandidate(candidate);

    if (title) {
      return title;
    }
  }

  return "";
}

function extractProviderTitle(input, content, payload, item) {
  if (input.titleMode === "custom" && input.customTitle) {
    return input.customTitle;
  }

  return titleFromProviderPayload(payload, item) || titleFromProviderText(content);
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coverPalette(input) {
  const source = `${input.mood} ${input.genres.join(" ")} ${input.styleDescription}`.toLowerCase();

  if (/우울|sad|blue|밤|night|moon/.test(source)) {
    return ["#07111f", "#173b63", "#e8f5ff", "#6bd4ff"];
  }

  if (/설레|romantic|love|r&b/.test(source)) {
    return ["#160913", "#ab3d76", "#ffe5a8", "#ff7a59"];
  }

  if (/행복|happy|pop|dance/.test(source)) {
    return ["#112417", "#7bf0ae", "#fff2a8", "#ff6b95"];
  }

  if (/에너지|edm|hip-hop|garage/.test(source)) {
    return ["#080817", "#3629ff", "#ff3d8c", "#73f2ff"];
  }

  return ["#0d1720", "#1bb7a8", "#f6c15b", "#ff6f61"];
}

function buildAlbumCoverSvg(input, title) {
  const [base, accent, warm, bright] = coverPalette(input);
  const genres = input.genres.slice(0, 3).join(" / ") || "Yumi";
  const titleText = escapeXml(title.replace(/\s+ACEMusic Track$/i, "").replace(/\s+데모 트랙$/i, ""));
  const mood = escapeXml(input.mood || "Yumi");
  const genreText = escapeXml(genres);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" role="img" aria-label="${titleText} album cover">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${base}"/>
      <stop offset="48%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${warm}"/>
    </linearGradient>
    <radialGradient id="moon" cx="68%" cy="20%" r="42%">
      <stop offset="0%" stop-color="${bright}" stop-opacity="0.95"/>
      <stop offset="52%" stop-color="${bright}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${bright}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.16"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#moon)"/>
  <rect width="1200" height="1200" filter="url(#grain)" opacity="0.45"/>
  <g opacity="0.72">
    <path d="M-80 810 C170 680 250 1030 520 820 C760 632 820 270 1280 400" fill="none" stroke="${bright}" stroke-width="36" stroke-linecap="round"/>
    <path d="M-40 915 C220 740 340 1110 620 878 C835 700 895 425 1260 510" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" opacity="0.64"/>
    <path d="M140 180 L1030 1040" stroke="#ffffff" stroke-width="2" opacity="0.24"/>
    <path d="M230 120 L1120 980" stroke="#ffffff" stroke-width="2" opacity="0.16"/>
  </g>
  <g transform="translate(95 120)">
    <rect x="0" y="0" width="228" height="48" rx="24" fill="#ffffff" opacity="0.16"/>
    <text x="28" y="32" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="4">YUMI</text>
  </g>
  <g transform="translate(95 790)">
    <text x="0" y="0" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="104" font-weight="900" letter-spacing="-2">
      ${titleText}
    </text>
    <text x="4" y="78" fill="#ffffff" opacity="0.78" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">
      ${mood} · ${genreText}
    </text>
  </g>
</svg>`;
}

async function persistAlbumCover(input, title) {
  const fileName = `${safeFileName(`${title}-${Date.now()}`) || `yumi-cover-${Date.now()}`}.svg`;
  await writeFile(path.join(generatedDir, fileName), buildAlbumCoverSvg(input, title), "utf8");
  return fileName;
}

function buildDisplayLyricsText(_input, content) {
  return extractGeneratedLyrics(content);
}

function detectMimeTypeFromDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,/i.exec(dataUrl);
  return match?.[1] || "audio/wav";
}

function extensionFromMimeType(mimeType) {
  if (mimeType.includes("wav")) {
    return "wav";
  }

  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3";
  }

  if (mimeType.includes("flac")) {
    return "flac";
  }

  if (mimeType.includes("ogg") || mimeType.includes("opus")) {
    return "ogg";
  }

  if (mimeType.includes("aac")) {
    return "aac";
  }

  return "bin";
}

function extractTextContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item?.text === "string") {
          return item.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function providerHeaders(apiKey, extra = {}) {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...extra
  };
}

async function fetchJson(baseUrl, pathname, options = {}, errorPrefix) {
  const response = await fetchWithTimeout(
    `${baseUrl}${pathname}`,
    options,
    acemusicRequestTimeoutMs,
    errorPrefix
  );
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.detail ||
      payload?.error ||
      `${errorPrefix} (${response.status})`;
    throw createUpstreamError(message, {
      statusCode: response.status >= 500 ? 502 : response.status,
      providerStatus: response.status,
      providerBodyPreview: text.slice(0, 1200),
      phase: "provider-response"
    });
  }

  return payload ?? text;
}

async function persistAudioBuffer(buffer, input, mimeType, explicitExtension, title) {
  const extension = explicitExtension || extensionFromMimeType(mimeType);
  const titleSeed = safeFileName(title || input.customTitle || input.mood || "yumi") || "yumi";
  const audioFileName = `${titleSeed}.${extension}`;
  await writeFile(path.join(generatedDir, audioFileName), buffer);
  return {
    audioFileName,
    contentType: mimeType
  };
}

function buildAcemusicHostedBody(input, prompt) {
  const strictLyricsMode = !isInstrumental(input) && looksLikeLiteralLyrics(input.lyricsOrIdea);

  return {
    model: acemusicModel,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    modalities: ["audio"],
    stream: false,
    task_type: "text2music",
    sample_mode: true,
    thinking: !strictLyricsMode,
    temperature: 0.85,
    top_p: 0.9,
    use_cot_caption: !strictLyricsMode,
    use_cot_language: !strictLyricsMode,
    use_cot_metas: !strictLyricsMode,
    guidance_scale: 7.0,
    audio_config: {
      format: "wav",
      vocal_language: detectVocalLanguage(input),
      instrumental: isInstrumental(input),
      duration: parseDuration(input.duration)
    }
  };
}

function extractHostedAudioItem(payload) {
  const message = payload?.choices?.[0]?.message;
  const candidates = Array.isArray(message?.audio)
    ? message.audio
    : Array.isArray(payload?.audio)
      ? payload.audio
      : [];

  const item = candidates.find((candidate) => {
    const url = candidate?.audio_url?.url || candidate?.url;
    return typeof url === "string" && url.length > 0;
  });

  if (!item) {
    throw new Error("ACEMusic 응답에서 오디오 데이터를 찾지 못했습니다.");
  }

  return {
    item,
    content: extractTextContent(message?.content),
    audioCodes: typeof message?.audio_codes === "string" ? message.audio_codes : ""
  };
}

async function persistHostedAudio(item, input, title) {
  const candidateUrl = item?.audio_url?.url || item?.url || "";

  if (!candidateUrl) {
    throw new Error("ACEMusic 오디오 URL이 비어 있습니다.");
  }

  if (candidateUrl.startsWith("data:")) {
    const mimeType = detectMimeTypeFromDataUrl(candidateUrl);
    const base64Data = candidateUrl.split(",", 2)[1] || "";

    if (!base64Data) {
      throw new Error("ACEMusic data URL의 base64 데이터가 비어 있습니다.");
    }

    return persistAudioBuffer(Buffer.from(base64Data, "base64"), input, mimeType, undefined, title);
  }

  const response = await fetchWithTimeout(
    candidateUrl,
    {
      headers: acemusicApiKey ? { Authorization: `Bearer ${acemusicApiKey}` } : {}
    },
    acemusicAudioTimeoutMs,
    "ACEMusic audio download failed"
  );

  if (!response.ok) {
    throw createUpstreamError(`ACEMusic 오디오 다운로드에 실패했습니다. (${response.status})`, {
      statusCode: 502,
      providerStatus: response.status,
      phase: "provider-audio-download"
    });
  }

  const contentType = response.headers.get("content-type") || item?.mime_type || "audio/wav";
  const extension = extensionFromMimeType(contentType);
  const arrayBuffer = await response.arrayBuffer();

  return persistAudioBuffer(Buffer.from(arrayBuffer), input, contentType, extension, title);
}

async function callAcemusicHosted(input, prompt, publicBaseUrl, requestId) {
  if (!acemusicApiKey) {
    throw createUpstreamError("ACEMUSIC_API_KEY가 서버 환경 변수 또는 .env.local에 설정되어 있지 않습니다.", {
      statusCode: 500,
      phase: "provider-config"
    });
  }

  const requestBody = buildAcemusicHostedBody(input, prompt);

  logRuntimeEvent("acemusic_request", {
    requestId,
    model: requestBody.model,
    duration: requestBody.audio_config.duration,
    vocalLanguage: requestBody.audio_config.vocal_language,
    instrumental: requestBody.audio_config.instrumental,
    endpoint: `${acemusicApiBaseUrl}/v1/chat/completions`
  });

  const payload = await fetchJson(
    acemusicApiBaseUrl,
    "/v1/chat/completions",
    {
      method: "POST",
      headers: {
        ...providerHeaders(acemusicApiKey),
        "User-Agent": "Yumi/0.1"
      },
      body: JSON.stringify(requestBody)
    },
    "ACEMusic hosted API 호출에 실패했습니다."
  );
  const { item, content, audioCodes } = extractHostedAudioItem(payload);

  logRuntimeEvent("acemusic_response", {
    requestId,
    model: payload?.model || acemusicModel,
    finishReason: payload?.choices?.[0]?.finish_reason,
    hasAudioUrl: Boolean(item?.audio_url?.url || item?.url)
  });

  const providerTitle = extractProviderTitle(input, content, payload, item);
  const title = providerTitle || createTitle(input);
  const savedAudio = await persistHostedAudio(item, input, title);
  const coverFileName = await persistAlbumCover(input, title);

  logRuntimeEvent("acemusic_audio_saved", {
    requestId,
    fileName: savedAudio.audioFileName,
    mimeType: savedAudio.contentType
  });

  return {
    title,
    audioUrl: `${publicBaseUrl}/generated/${encodeURIComponent(savedAudio.audioFileName)}`,
    imageUrl: `${publicBaseUrl}/generated/${encodeURIComponent(coverFileName)}`,
    fileName: savedAudio.audioFileName,
    coverFileName,
    mimeType: savedAudio.contentType,
    prompt,
    lyricsText: buildDisplayLyricsText(input, content, prompt),
    metadata: {
      mode: "hosted-chat-completions",
      model: payload?.model || acemusicModel,
      finishReason: payload?.choices?.[0]?.finish_reason,
      providerTitle,
      audioCodes,
      request: requestBody
    }
  };
}

async function loadDemoTrack() {
  try {
    const parsed = JSON.parse(await readFile(demoManifestPath, "utf8"));

    if (Array.isArray(parsed) && parsed[0]) {
      return parsed[0];
    }
  } catch {
    // Missing demo manifest falls back to a text-only demo result.
  }

  return null;
}

async function createDemoResult(input, prompt, usage, reason, publicBaseUrl) {
  const demoTrack = await loadDemoTrack();
  const demoPrompt = typeof demoTrack?.prompt === "string" ? demoTrack.prompt : prompt;
  const demoLyrics = typeof demoTrack?.lyricsText === "string" ? demoTrack.lyricsText : "";
  const title = createTitle(input);
  const coverFileName =
    typeof demoTrack?.imageUrl === "string" && demoTrack.imageUrl
      ? ""
      : await persistAlbumCover(input, title);

  return {
    title,
    audioUrl: typeof demoTrack?.audioUrl === "string" ? demoTrack.audioUrl : "",
    imageUrl:
      typeof demoTrack?.imageUrl === "string" && demoTrack.imageUrl
        ? demoTrack.imageUrl
        : `${publicBaseUrl}/generated/${encodeURIComponent(coverFileName)}`,
    prompt: demoPrompt,
    lyricsText: buildDisplayLyricsText(input, demoLyrics, prompt),
    provider: "demo",
    providerLabel: "Demo Result",
    source: "demo",
    metadata: {
      mode: "demo-only",
      manifestLoaded: Boolean(demoTrack)
    },
    usage: usagePayload(usage),
    notice: reason
  };
}

async function generateWithProvider(input, prompt, publicBaseUrl, requestId) {
  const generated = await callAcemusicHosted(input, prompt, publicBaseUrl, requestId);

  return {
    ...generated,
    provider,
    providerLabel: providerCatalog[provider].label,
    source: "local"
  };
}

async function generateTrack(request, response, origin, requestId) {
  const body = await readRequestBody(request);
  const input = normalizeInput(body.input || {});

  if (!hasMeaningfulInput(input)) {
    sendJson(response, 400, { error: "생성 입력값이 비어 있습니다." }, origin);
    return;
  }

  const prompt = buildStructuredPrompt(input);
  const publicBaseUrl = publicBaseUrlFromRequest(request);

  const usage = await readUsage();

  logRuntimeEvent("generation_start", {
    requestId,
    source: demoOnlyMode ? "demo" : provider,
    mood: input.mood,
    genres: input.genres,
    duration: parseDuration(input.duration)
  });

  if (demoOnlyMode) {
    sendJson(
      response,
      200,
      await createDemoResult(
        input,
        prompt,
        usage,
        "demo-only 모드에서는 실제 생성 대신 미리 준비한 데모 결과만 보여줍니다.",
        publicBaseUrl
      ),
      origin
    );
    return;
  }

  if (dailyLimit && usage.count >= dailyLimit) {
    sendJson(
      response,
      429,
      {
        error: `오늘의 로컬 생성 한도 ${dailyLimit}곡을 모두 사용했습니다.`,
        usage: usagePayload(usage)
      },
      origin
    );
    return;
  }

  const generated = await generateWithProvider(input, prompt, publicBaseUrl, requestId);
  const nextUsage = { date: usage.date, count: usage.count + 1 };
  await writeUsage(nextUsage);

  logRuntimeEvent("generation_success", {
    requestId,
    title: generated.title,
    source: generated.source,
    usageCount: nextUsage.count
  });

  sendJson(
    response,
    200,
    {
      ...generated,
      usage: usagePayload(nextUsage)
    },
    origin
  );
}

function serveGeneratedFile(request, response, origin) {
  const requestUrl = new URL(request.url, localApiBase());
  const encodedName = requestUrl.pathname.replace("/generated/", "");
  const fileName = path.basename(decodeURIComponent(encodedName));
  const filePath = path.join(generatedDir, fileName);

  if (!existsSync(filePath)) {
    sendJson(response, 404, { error: "파일을 찾을 수 없습니다." }, origin);
    return;
  }

  const extension = path.extname(fileName).toLowerCase();
  const contentType =
    extension === ".svg"
      ? "image/svg+xml; charset=utf-8"
      : extension === ".png"
        ? "image/png"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : extension === ".webp"
            ? "image/webp"
            : extension === ".txt"
              ? "text/plain; charset=utf-8"
              : extension === ".flac"
      ? "audio/flac"
      : extension === ".wav"
        ? "audio/wav"
        : extension === ".ogg" || extension === ".opus"
          ? "audio/ogg"
          : extension === ".aac"
          ? "audio/aac"
            : "audio/mpeg";
  const downloadName = path
    .basename(requestUrl.searchParams.get("filename") || fileName)
    .replace(/["\r\n]/g, "")
    .slice(0, 140);
  const headers = {
    "Content-Type": contentType,
    ...corsHeaders(origin)
  };

  if (requestUrl.searchParams.get("download") === "1") {
    headers["Content-Disposition"] =
      `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
  }

  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
}

const staticContentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8"
};

async function isReadableFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function serveStaticAsset(request, response, origin) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (!existsSync(distDir)) {
    return false;
  }

  const requestUrl = new URL(request.url, localApiBase());
  const requestedPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const assetPath = path.normalize(path.join(distDir, relativePath));
  const isInsideDist = assetPath === distDir || assetPath.startsWith(`${distDir}${path.sep}`);

  if (!isInsideDist) {
    sendJson(response, 403, { error: "Forbidden" }, origin);
    return true;
  }

  let filePath = assetPath;

  if (!(await isReadableFile(filePath))) {
    filePath = path.join(distDir, "index.html");
  }

  if (!(await isReadableFile(filePath))) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  const isIndex = path.basename(filePath) === "index.html";

  response.writeHead(200, {
    "Content-Type": staticContentTypes[extension] || "application/octet-stream",
    "Cache-Control": isIndex ? "no-store" : "public, max-age=31536000, immutable",
    ...corsHeaders(origin)
  });

  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  createReadStream(filePath).pipe(response);
  return true;
}

function buildHealthPayload() {
  return {
    ok: true,
    provider,
    providerLabel: providerCatalog[provider]?.label || provider,
    demoOnlyMode,
    dailyLimit,
    bindHost,
    allowedOrigins,
    localApiPort: port,
    providerConfig: {
      apiBaseUrl: acemusicApiBaseUrl,
      apiKeyConfigured: Boolean(acemusicApiKey),
      endpointStyle: "openai-chat-completions"
    }
  };
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  const requestId = createRequestId();

  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders(origin));
      response.end();
      return;
    }

    if (origin && !isAllowedOrigin(origin, request)) {
      sendJson(response, 403, { error: "허용되지 않은 Origin입니다." }, origin);
      return;
    }

    if (request.url === "/api/health" && request.method === "GET") {
      sendJson(response, 200, buildHealthPayload(), origin);
      return;
    }

    if (request.url === "/api/usage" && request.method === "GET") {
      sendJson(response, 200, usagePayload(await readUsage()), origin);
      return;
    }

    if (request.url === "/api/generate" && request.method === "POST") {
      await generateTrack(request, response, origin, requestId);
      return;
    }

    if (request.url?.startsWith("/generated/") && request.method === "GET") {
      serveGeneratedFile(request, response, origin);
      return;
    }

    if (await serveStaticAsset(request, response, origin)) {
      return;
    }

    sendJson(response, 404, { error: "Not found" }, origin);
  } catch (error) {
    const statusCode = publicStatusCode(error);

    logRuntimeError("request_failed", error, {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      providerStatus: error?.providerStatus,
      phase: error?.phase,
      providerBodyPreview: error?.providerBodyPreview
    });

    sendJson(
      response,
      statusCode,
      {
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        requestId
      },
      origin
    );
  }
});

server.listen(port, bindHost, () => {
  console.log(`[yumi] local music backend listening on ${localApiBase()}`);
  console.log(`[yumi] provider=${provider} demoOnly=${demoOnlyMode}`);
});
