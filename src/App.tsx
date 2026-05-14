import { useMemo, useRef, useState } from "react";

type ResultSource = "local" | "demo";
type DownloadAsset = "track" | "cover" | "lyrics";
type SongTitleMode = "auto" | "custom";

type MusicGenerationInput = {
  mood: string;
  genres: string[];
  artists: string[];
  styleDescription: string;
  lyricsOrIdea: string;
  vocalTone: string;
  soundDetails: string;
  duration: string;
  titleMode: SongTitleMode;
  customTitle: string;
};

type GeneratedMusicResult = {
  title: string;
  audioUrl?: string;
  imageUrl?: string;
  prompt: string;
  lyricsText?: string;
  source: ResultSource;
  provider?: string;
  providerLabel?: string;
  metadata?: Record<string, unknown>;
  notice?: string;
  usage?: {
    date: string;
    count: number;
    limit: number | null;
    provider?: string;
    purpose?: string;
  };
};

type SubtitleCue = {
  text: string;
  start?: number;
  end?: number;
  weight: number;
};

const musicApiBase =
  import.meta.env.VITE_MUSIC_API_BASE || (import.meta.env.PROD ? "" : "http://127.0.0.1:4000");

const moodOptions = ["차분한", "설레는", "행복한", "우울한", "집중하고 싶은", "에너지가 필요한"];
const genreOptions = ["K-pop", "R&B", "Pop", "Lo-fi", "Ballad", "Hip-hop", "EDM", "Acoustic"];
const artistExamples = ["BTS", "TXT", "Taylor Swift", "Lady Gaga", "Coldplay", "JENNIE", "Queen", "Stray Kids", "Michael Jackson"];
const vocalOptions = [
  "부드러운 남성 보컬",
  "맑은 여성 보컬",
  "허스키한 저음",
  "숨결이 가까운 보컬",
  "보컬 없이 인스트루멘털"
];
const durationOptions = ["60초", "90초", "약 2분", "약 3분"];
const soundOptions = ["warm bass", "clean drums", "soft synth pad", "Rhodes piano", "acoustic guitar"];
const quickIdeas = [
  "Make any song you can imagine",
  "Make a K-pop R&B song about walking home after midnight",
  "Make a house song about quitting your job",
  "Make a country song about Jess being late",
  "한국어 verse + English hook about starting again"
];

const splitArtists = (value: string) =>
  value
    .split(",")
    .map((artist) => artist.trim())
    .filter(Boolean);

const joinNonEmpty = (items: Array<string | undefined>) => items.filter(Boolean).join(" · ");

const normalizeMultilineText = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

const lyricsHeadingPattern = /^(?:#{1,6}\s*)?(?:lyrics|가사)\s*:?\s*$/i;
const inlineLyricsHeadingPattern = /^(?:#{1,6}\s*)?(?:lyrics|가사)\s*:\s*(.+)$/i;
const metadataHeadingPattern =
  /^(?:#{1,6}\s*)?(?:metadata|meta\s*data|메타데이터|request|prompt|audio\s*metadata)\b/i;
const markdownHeadingPattern = /^#{1,6}\s+\S+/;
const generatedTextNoisePattern =
  /ACEMusic|로컬 생성|배포용 데모|배포 버전|공개 배포|Demo manifest|Demo Result|Create one original|Lyrics instruction/i;
const generatedMetadataKeyPattern =
  /^[-*]?\s*["']?(?:metadata|model|mode|request|messages|modalities|provider|source|usage|notice|prompt|audio|audioCodes|audio_config|finishReason|finish_reason|title|mood|genre|genres|vocal|duration|instrumental|sample_mode|temperature|top_p|guidance_scale|task_type)["']?\s*[:={]/i;

const isGeneratedLyricsLine = (line: string) => {
  const trimmed = line.trim();

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
};

const extractGeneratedLyrics = (value?: string) => {
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
};

const resolveLyricsText = (_input: MusicGenerationInput, providerLyrics?: string) =>
  extractGeneratedLyrics(providerLyrics);

const lyricLinesFromText = (value: string) =>
  extractGeneratedLyrics(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);

const subtitleSectionLabelPattern = /^\[[^\]]+\]$/;

const parseTimestampSeconds = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(":").map(Number);

  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
};

const extractTimedSubtitleCues = (metadata: Record<string, unknown> | undefined) => {
  const candidates = [
    metadata?.timestamps,
    metadata?.lyricsTimestamps,
    metadata?.lyricTimestamps,
    metadata?.segments,
    metadata?.captions
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const cues = candidate
      .map((item): SubtitleCue | null => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const text = String(record.text || record.line || record.lyric || "").trim();
        const start = parseTimestampSeconds(record.start ?? record.startTime ?? record.from);
        const end = parseTimestampSeconds(record.end ?? record.endTime ?? record.to);

        if (!text || start === null) {
          return null;
        }

        return {
          text,
          start,
          end: end ?? undefined,
          weight: 1
        };
      })
      .filter((cue): cue is SubtitleCue => cue !== null);

    if (cues.length > 0) {
      return cues;
    }
  }

  return [];
};

const buildSubtitleCues = (
  lines: string[],
  metadata: Record<string, unknown> | undefined
): SubtitleCue[] => {
  const timedCues = extractTimedSubtitleCues(metadata);

  if (timedCues.length > 0) {
    return timedCues;
  }

  return lines.map((line): SubtitleCue => ({
    text: line,
    weight: subtitleSectionLabelPattern.test(line) ? 0.28 : 1
  }));
};

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildLocalCoverDataUrl = (input: MusicGenerationInput, title: string) => {
  const titleText = escapeSvgText(title.replace(/\s+ACEMusic Track$/i, ""));
  const moodText = escapeSvgText(input.mood || "Yumi");
  const genreText = escapeSvgText(input.genres.slice(0, 3).join(" / ") || "Yumi");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07111f"/>
      <stop offset="0.52" stop-color="#1bb7a8"/>
      <stop offset="1" stop-color="#ff7a59"/>
    </linearGradient>
    <radialGradient id="glow" cx="70%" cy="20%" r="48%">
      <stop offset="0" stop-color="#f8f4df" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#f8f4df" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <path d="M-70 820 C190 660 290 1060 560 820 C770 635 860 300 1270 420" fill="none" stroke="#eafffb" stroke-width="36" stroke-linecap="round" opacity="0.64"/>
  <path d="M-20 930 C220 760 340 1090 650 880 C850 740 920 440 1240 520" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.5"/>
  <text x="92" y="160" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" letter-spacing="6">YUMI</text>
  <text x="92" y="850" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="96" font-weight="900">${titleText}</text>
  <text x="98" y="930" fill="#fff" opacity="0.76" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">${moodText} · ${genreText}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const safeDownloadName = (value: string, fallback: string) =>
  (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;

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

const hashString = (value: string) =>
  Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 17);

const toTitleCase = (value: string) =>
  value.replace(/\b[a-z]/g, (match) => match.toUpperCase());

const createCreativeTitle = (input: MusicGenerationInput) => {
  const customTitle = normalizeMultilineText(input.customTitle);

  if (input.titleMode === "custom" && customTitle) {
    return customTitle;
  }

  const source = normalizeMultilineText(
    [
      input.lyricsOrIdea,
      input.styleDescription,
      input.soundDetails,
      input.mood,
      input.genres.join(" "),
      input.vocalTone
    ].join(" ")
  );
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
};

const isGenericSongTitle = (value?: string) =>
  !value || /데모 트랙|ACEMusic Track|Yumi Sketch|K-pop|차분한|설레는|행복한|우울한/.test(value);

const downloadTextFile = (fileName: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
};

const triggerDownload = (url: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const appendDownloadParams = (url: string, fileName: string) => {
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set("download", "1");
    parsed.searchParams.set("filename", fileName);
    return parsed.toString();
  } catch {
    return url;
  }
};

const downloadAssetUrl = async (url: string, fileName: string) => {
  if (url.startsWith("data:")) {
    triggerDownload(url, fileName);
    return;
  }

  try {
    const response = await fetch(url, { mode: "cors" });

    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 800);
  } catch {
    triggerDownload(appendDownloadParams(url, fileName), fileName);
  }
};

const buildYumiPromptPreview = (input: MusicGenerationInput) => {
  const artists = input.artists.length > 0 ? input.artists.join(", ") : "없음";
  const instrumental = input.vocalTone.includes("보컬 없이");
  const title = createCreativeTitle(input);

  return [
    "유미(Yumi)를 위한 오리지널 곡 제작 브리프",
    `곡 제목: ${title}`,
    `제목 방식: ${input.titleMode === "custom" ? "직접 제목" : "자동 제목"}`,
    `감정: ${input.mood || "미정"}`,
    `장르/스타일: ${input.genres.join(", ") || "미정"}`,
    `참고 취향: ${artists} (직접 모방 금지, 분위기 참고만)`,
    `가사 원문 / 아이디어: ${input.lyricsOrIdea || "미정"}`,
    `스타일 설명: ${input.styleDescription || "미정"}`,
    `보컬 지시: ${instrumental ? "보컬 없이 인스트루멘털" : input.vocalTone || "미정"}`,
    `사운드 디테일: ${input.soundDetails || "미정"}`,
    `희망 길이: ${input.duration || "약 2분"}`,
    "요청사항: 입력한 가사는 요약하지 않고 그대로 전달합니다. 한국어는 한글로, 영어는 영어로 유지합니다."
  ].join("\n");
};

const createFallbackResult = (
  input: MusicGenerationInput,
  prompt: string,
  reason?: string
): GeneratedMusicResult => ({
  title: createCreativeTitle(input),
  prompt,
  source: "demo",
  provider: "demo",
  providerLabel: "Demo Result",
  notice: reason,
  lyricsText: ""
});

const loadDemoResult = async (
  input: MusicGenerationInput,
  prompt: string
): Promise<GeneratedMusicResult> => {
  try {
    const response = await fetch("/demo/tracks.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Demo manifest not found");
    }

    const tracks = (await response.json()) as Array<Partial<GeneratedMusicResult>>;
    const firstTrack = tracks[0];

    if (!firstTrack) {
      throw new Error("Demo manifest is empty");
    }

    return {
      title: createCreativeTitle(input),
      audioUrl: firstTrack.audioUrl,
      imageUrl: firstTrack.imageUrl,
      prompt: firstTrack.prompt || prompt,
      lyricsText: firstTrack.lyricsText,
      source: "demo",
      provider: "demo",
      providerLabel: "Demo Result"
    };
  } catch {
    return createFallbackResult(input, prompt);
  }
};

export default function App() {
  const [selectedMood, setSelectedMood] = useState("차분한");
  const [selectedGenres, setSelectedGenres] = useState(["K-pop", "R&B"]);
  const [artists, setArtists] = useState("BTS, Taylor Swift");
  const [styleDescription, setStyleDescription] = useState(
    "차분한 밤 산책에 어울리는 감성적인 K-pop R&B. 따뜻한 베이스와 깨끗한 드럼, 가까운 보컬."
  );
  const [lyricsOrIdea, setLyricsOrIdea] = useState(
    "지친 하루 끝에서 다시 시작하고 싶은 마음을 담은 노래"
  );
  const [vocalTone, setVocalTone] = useState("부드러운 남성 보컬");
  const [soundDetails, setSoundDetails] = useState("warm bass, clean drums, soft synth pad");
  const [duration, setDuration] = useState("약 2분");
  const [titleMode, setTitleMode] = useState<SongTitleMode>("auto");
  const [customTitle, setCustomTitle] = useState("");
  const [result, setResult] = useState<GeneratedMusicResult | null>(null);
  const [message, setMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const artistList = splitArtists(artists);

  const generationInput = useMemo<MusicGenerationInput>(
    () => ({
      mood: selectedMood,
      genres: selectedGenres,
      artists: artistList,
      styleDescription,
      lyricsOrIdea,
      vocalTone,
      soundDetails,
      duration,
      titleMode,
      customTitle
    }),
    [
      artistList,
      customTitle,
      duration,
      lyricsOrIdea,
      selectedGenres,
      selectedMood,
      soundDetails,
      styleDescription,
      titleMode,
      vocalTone
    ]
  );

  const promptPreview = useMemo(() => buildYumiPromptPreview(generationInput), [generationInput]);
  const canCreate = Boolean(
    selectedMood &&
      selectedGenres.length > 0 &&
      lyricsOrIdea.trim() &&
      (titleMode === "auto" || customTitle.trim())
  );
  const isInstrumental = vocalTone.includes("보컬 없이");
  const draftTitle = createCreativeTitle(generationInput);
  const panelTitle = result?.title || draftTitle;
  const panelLabel =
    result?.source === "local"
      ? result.providerLabel || "ACEMusic hosted API"
      : result?.source === "demo"
      ? "Demo Result"
      : "Now Creating";
  const lyricsDisplay = result ? resolveLyricsText(generationInput, result.lyricsText) : "";
  const lyricLines = useMemo(() => lyricLinesFromText(lyricsDisplay), [lyricsDisplay]);
  const subtitleCues = useMemo(
    () => buildSubtitleCues(lyricLines, result?.metadata),
    [lyricLines, result?.metadata]
  );
  const currentSubtitle = subtitleCues[currentLineIndex]?.text || subtitleCues[0]?.text || "";
  const coverImageUrl = result?.imageUrl || buildLocalCoverDataUrl(generationInput, panelTitle);

  const selectionSummary = joinNonEmpty([
    selectedMood,
    selectedGenres.join(", "),
    artistList.length > 0 ? artistList.join(", ") : undefined,
    isInstrumental ? "인스트루멘털" : vocalTone,
    duration
  ]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]
    );
  };

  const appendPromptIdea = (value: string) => {
    setLyricsOrIdea((current) => (current.includes(value) ? current : `${current.trim()}\n${value}`.trim()));
  };

  const appendText = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter((current) => (current.includes(value) ? current : `${current.trim()}${current.trim() ? ", " : ""}${value}`));
  };

  const resetComposer = () => {
    setResult(null);
    setMessage("");
    setShowDownloads(false);
    setIsAudioPlaying(false);
    setCurrentLineIndex(0);
    setIsLoading(false);
  };

  const updateSubtitle = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;

    if (!audio.duration || !Number.isFinite(audio.duration) || subtitleCues.length <= 1) {
      return;
    }

    const timedCueIndex = subtitleCues.findIndex((cue, index) => {
      if (typeof cue.start !== "number") {
        return false;
      }

      const nextStart = subtitleCues[index + 1]?.start;
      const end = typeof cue.end === "number" ? cue.end : nextStart;
      return audio.currentTime >= cue.start && (typeof end !== "number" || audio.currentTime < end);
    });

    if (timedCueIndex >= 0) {
      setCurrentLineIndex(timedCueIndex);
      return;
    }

    const totalWeight = subtitleCues.reduce((sum, cue) => sum + cue.weight, 0);
    const progressWeight = (audio.currentTime / audio.duration) * totalWeight;
    let accumulatedWeight = 0;
    let nextIndex = subtitleCues.length - 1;

    for (let index = 0; index < subtitleCues.length; index += 1) {
      accumulatedWeight += subtitleCues[index].weight;

      if (progressWeight <= accumulatedWeight) {
        nextIndex = index;
        break;
      }
    }

    setCurrentLineIndex(nextIndex);
  };

  const handleDownload = async (asset: DownloadAsset) => {
    if (!result) {
      return;
    }

    const baseName = safeDownloadName(result.title, "yumi-track");

    try {
      setShowDownloads(false);

      if (asset === "lyrics") {
        if (!lyricsDisplay) {
          setMessage("다운로드할 가사가 없습니다.");
          return;
        }

        downloadTextFile(`${baseName}-lyrics.txt`, lyricsDisplay);
        return;
      }

      if (asset === "cover") {
        await downloadAssetUrl(coverImageUrl, `${baseName}-cover.svg`);
        return;
      }

      if (!result.audioUrl) {
        setMessage("다운로드할 오디오가 없습니다.");
        return;
      }

      await downloadAssetUrl(result.audioUrl, `${baseName}.wav`);
    } catch {
      setMessage("다운로드를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleGenerate = async () => {
    if (!canCreate) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setShowDownloads(false);
    setIsAudioPlaying(false);

    try {
      const response = await fetch(`${musicApiBase}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: generationInput,
          prompt: promptPreview
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        const requestId = typeof payload.requestId === "string" ? ` requestId=${payload.requestId}` : "";
        throw new Error(`${payload.error || "ACEMusic 생성에 실패했습니다."}${requestId}`);
      }

      setResult({
        title: isGenericSongTitle(payload.title) ? createCreativeTitle(generationInput) : payload.title,
        audioUrl: payload.audioUrl,
        imageUrl: payload.imageUrl,
        prompt: payload.prompt || promptPreview,
        lyricsText: payload.lyricsText,
        source: payload.source === "demo" ? "demo" : "local",
        provider: payload.provider,
        providerLabel: payload.providerLabel,
        metadata: payload.metadata,
        notice: payload.notice,
        usage: payload.usage
      });
      setMessage(
        payload.notice ||
          (payload.source === "demo"
            ? "실제 생성 대신 데모 결과를 표시했습니다."
            : "ACEMusic에서 새 트랙을 가져왔습니다.")
      );
      setCurrentLineIndex(0);
    } catch (error) {
      const demoResult = await loadDemoResult(generationInput, promptPreview);
      const errorText =
        error instanceof Error ? error.message : "로컬 생성 서버에 연결할 수 없습니다.";

      setResult({
        ...demoResult,
        lyricsText: demoResult.lyricsText
      });
      setMessage(`ACEMusic 연결에 실패해 데모 결과를 표시했습니다. ${errorText}`);
      setCurrentLineIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090b10] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1800&q=80')"
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,16,0.18),rgba(9,11,16,0.94)_42%,rgba(9,11,16,1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,198,179,0.18),transparent_38%,rgba(255,120,90,0.22)_82%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-8 pt-6 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <button
            className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-white/5"
            type="button"
            aria-label="Yumi home"
            onClick={resetComposer}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-lg font-black text-white backdrop-blur">
              Y
            </span>
            <span>
              <span className="block text-lg font-black">유미</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                AI Music Creator
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
              ACEMusic
            </span>
            <button
              className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/12"
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "간단히 보기" : "고급 설정"}
            </button>
          </div>
        </header>

        <main className="mt-10 grid flex-1 gap-8 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <section className="flex min-h-[720px] flex-col">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#9ff3e6]">
                Chat To Make Music
              </p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[1.02] text-white md:text-7xl">
                Make any song you can imagine.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Write the scene, genre, lyric idea, and vocal mood in one place. Yumi turns the result into a
                track, cover, and downloadable song package.
              </p>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-[#140f16]/78 shadow-[0_28px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <div className="px-6 pb-5 pt-6 md:px-8 md:pb-6">
                <textarea
                  className="min-h-44 w-full resize-none bg-transparent text-lg leading-8 text-white outline-none placeholder:text-white/28 md:min-h-52 md:text-xl"
                  placeholder="Describe the song you want to make. Example: Korean verse, English hook, moonlit K-pop R&B, soft male vocal..."
                  value={lyricsOrIdea}
                  onChange={(event) => setLyricsOrIdea(event.target.value)}
                />

                <div className="mt-5 flex flex-wrap gap-2">
                  {quickIdeas.map((idea) => (
                    <button
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/12 hover:text-white"
                      key={idea}
                      type="button"
                      onClick={() => appendPromptIdea(idea)}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 px-6 py-4 md:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {moodOptions.map((mood) => (
                      <button
                        className={
                          selectedMood === mood
                            ? "rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f1115]"
                            : "rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                        }
                        key={mood}
                        type="button"
                        onClick={() => setSelectedMood(mood)}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/68">
                      {selectionSummary}
                    </span>
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a59,#ff5aa3_52%,#f2b94b)] px-6 py-3 text-sm font-black text-white shadow-[0_18px_50px_rgba(255,106,93,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                      type="button"
                      disabled={!canCreate || isLoading}
                      onClick={handleGenerate}
                    >
                      {isLoading ? "생성 중..." : "Create"}
                    </button>
                  </div>
                </div>
              </div>

              {showAdvanced && (
                <div className="border-t border-white/10 px-6 py-6 md:px-8">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]">
                        장르
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {genreOptions.map((genre) => (
                          <button
                            className={
                              selectedGenres.includes(genre)
                                ? "rounded-full bg-[#d7f5ef] px-4 py-2 text-sm font-black text-[#0e756f]"
                                : "rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                            }
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]" htmlFor="artists">
                        참고 아티스트
                      </label>
                      <input
                        className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#9ff3e6]"
                        id="artists"
                        placeholder="DEAN, Frank Ocean"
                        type="text"
                        value={artists}
                        onChange={(event) => setArtists(event.target.value)}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {artistExamples.map((artist) => (
                          <button
                            className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                            key={artist}
                            type="button"
                            onClick={() =>
                              setArtists((current) =>
                                current.includes(artist)
                                  ? current
                                  : current.trim()
                                    ? `${current}, ${artist}`
                                    : artist
                              )
                            }
                          >
                            {artist}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]">
                        제목
                      </p>
                      <div className="mt-3 grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1">
                        <button
                          className={
                            titleMode === "auto"
                              ? "rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f1115]"
                              : "rounded-full px-4 py-2 text-sm font-bold text-white/62 transition hover:text-white"
                          }
                          type="button"
                          onClick={() => setTitleMode("auto")}
                        >
                          자동 제목
                        </button>
                        <button
                          className={
                            titleMode === "custom"
                              ? "rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f1115]"
                              : "rounded-full px-4 py-2 text-sm font-bold text-white/62 transition hover:text-white"
                          }
                          type="button"
                          onClick={() => setTitleMode("custom")}
                        >
                          직접 제목
                        </button>
                      </div>
                      <input
                        className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#9ff3e6] disabled:opacity-45"
                        disabled={titleMode === "auto"}
                        placeholder={titleMode === "auto" ? draftTitle : "Moon and the Sharks"}
                        type="text"
                        value={customTitle}
                        onChange={(event) => setCustomTitle(event.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]" htmlFor="style-description">
                        스타일 설명
                      </label>
                      <textarea
                        className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28 focus:border-[#9ff3e6]"
                        id="style-description"
                        value={styleDescription}
                        onChange={(event) => setStyleDescription(event.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]" htmlFor="sound-details">
                        사운드 디테일
                      </label>
                      <textarea
                        className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28 focus:border-[#9ff3e6]"
                        id="sound-details"
                        value={soundDetails}
                        onChange={(event) => setSoundDetails(event.target.value)}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {soundOptions.map((option) => (
                          <button
                            className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                            key={option}
                            type="button"
                            onClick={() => appendText(setSoundDetails, option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]">
                        보컬
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {vocalOptions.map((option) => (
                          <button
                            className={
                              vocalTone === option
                                ? "rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f1115]"
                                : "rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                            }
                            key={option}
                            type="button"
                            onClick={() => setVocalTone(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]">
                        길이
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {durationOptions.map((option) => (
                          <button
                            className={
                              duration === option
                                ? "rounded-full bg-white px-4 py-2 text-sm font-black text-[#0f1115]"
                                : "rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white"
                            }
                            key={option}
                            type="button"
                            onClick={() => setDuration(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-start gap-3 text-sm text-white/56">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-semibold">
                {result?.source === "local" ? "실제 생성 결과" : result?.source === "demo" ? "데모 결과" : "생성 대기"}
              </span>
              {message && <span className="max-w-3xl leading-6">{message}</span>}
            </div>
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-[#10141c]/82 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#161b25]">
              <img alt="" className="aspect-square w-full object-cover" src={coverImageUrl} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.08)_48%,rgba(0,0,0,0.62))]" />
              <div className="absolute left-4 top-4 rounded-full bg-black/46 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-white backdrop-blur">
                Album Cover
              </div>
              <div className="absolute right-4 top-4">
                <button
                  className="rounded-full bg-black/48 px-4 py-2 text-xs font-black text-white backdrop-blur transition hover:bg-black/68 disabled:opacity-45"
                  type="button"
                  disabled={!result}
                  onClick={() => setShowDownloads((current) => !current)}
                >
                  Download
                </button>
                {showDownloads && result && (
                  <div className="absolute right-0 top-11 z-10 w-52 rounded-2xl border border-white/10 bg-[#17191f]/96 p-2 shadow-2xl backdrop-blur">
                    <button
                      className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-white/82 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      type="button"
                      disabled={!result.audioUrl}
                      onClick={() => void handleDownload("track")}
                    >
                      트랙 다운로드
                    </button>
                    <button
                      className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-white/82 transition hover:bg-white/10 hover:text-white"
                      type="button"
                      onClick={() => void handleDownload("cover")}
                    >
                      앨범 커버
                    </button>
                    <button
                      className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-white/82 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      type="button"
                      disabled={!lyricsDisplay}
                      onClick={() => void handleDownload("lyrics")}
                    >
                      가사 텍스트
                    </button>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <button
                  className="grid size-20 place-items-center rounded-full bg-black/54 text-3xl font-black text-white backdrop-blur transition hover:scale-105 hover:bg-black/70 disabled:opacity-45"
                  type="button"
                  disabled={!result?.audioUrl}
                  onClick={() => {
                    const audio = audioRef.current;

                    if (!audio) {
                      return;
                    }

                    if (audio.paused) {
                      void audio.play();
                    } else {
                      audio.pause();
                    }
                  }}
                  aria-label="Play or pause"
                >
                  {isAudioPlaying ? "Ⅱ" : "▶"}
                </button>
              </div>
              {showSubtitles && currentSubtitle && (
                <div className="absolute inset-x-4 bottom-4">
                <div className="rounded-2xl bg-black/54 px-4 py-3 text-center text-sm font-bold leading-6 text-white shadow-lg backdrop-blur">
                  {currentSubtitle}
                </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9ff3e6]">{panelLabel}</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">{panelTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-white/62">
                {result?.source === "demo"
                  ? "실제 생성이 실패하면 준비된 preview 결과로 전환됩니다."
                  : "생성 결과, 오디오, 가사 메타데이터를 한곳에서 확인합니다."}
              </p>
            </div>

            <div className="mt-5 space-y-3 border-y border-white/10 py-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/46">Mood</span>
                <strong className="text-right">{selectedMood}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/46">Genre</span>
                <strong className="text-right">{selectedGenres.join(", ")}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-white/46">Vocal</span>
                <strong className="text-right">{isInstrumental ? "Instrumental" : vocalTone}</strong>
              </div>
              {result?.usage && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/46">{result.usage.limit ? "Usage" : "Local Record"}</span>
                  <strong className="text-right">
                    {result.usage.limit
                      ? `${result.usage.count} / ${result.usage.limit}`
                      : `${result.usage.count} tracks`}
                  </strong>
                </div>
              )}
            </div>

            {result?.audioUrl ? (
              <audio
                className="mt-5 w-full"
                controls
                ref={audioRef}
                src={result.audioUrl}
                onTimeUpdate={updateSubtitle}
                onLoadedMetadata={() => setCurrentLineIndex(0)}
                onPlay={() => setIsAudioPlaying(true)}
                onPause={() => setIsAudioPlaying(false)}
                onEnded={() => setIsAudioPlaying(false)}
              >
                <track kind="captions" />
              </audio>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.04] px-4 py-5 text-sm leading-6 text-white/52">
                생성이 끝나면 이 영역에서 바로 재생됩니다.
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm font-black text-white">가사</span>
              <button
                className={
                  showSubtitles
                    ? "rounded-full bg-white px-3 py-1 text-xs font-black text-[#0f1115]"
                    : "rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/62 transition hover:text-white"
                }
                type="button"
                onClick={() => setShowSubtitles((current) => !current)}
              >
                Subtitles
              </button>
            </div>

            <div className="mt-4 h-[280px] overflow-auto rounded-[24px] border border-white/10 bg-black/20 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-white/78">
                {result ? lyricsDisplay : ""}
              </pre>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
