export type MusicGenerationInput = {
  mood: string;
  genres: string[];
  artists?: string;
  lyrics?: string;
  idea?: string;
  vocalStyle?: string;
  soundDescription?: string;
};

export type GeneratedMusicResult = {
  title: string;
  audioUrl: string;
  imageUrl: string;
  videoUrl: string;
};
