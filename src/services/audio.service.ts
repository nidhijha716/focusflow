export interface AudioPlayOptions {
  loop?: boolean;
  volume?: number;
}

/**
 * Thin abstraction over HTMLAudioElement so callers never touch browser
 * audio APIs directly (02_Technical_Architecture §2: alarm/ambient audio).
 * Asset lists, licensing, and mixing behavior are feature-level concerns
 * implemented in a later phase — this scaffold only defines the contract.
 */
export interface AudioService {
  preload: (id: string, src: string) => void;
  play: (id: string, options?: AudioPlayOptions) => void;
  stop: (id: string) => void;
  stopAll: () => void;
  /** Updates volume on an already-preloaded/playing element without restarting it. */
  setVolume: (id: string, volume: number) => void;
}

class HtmlAudioService implements AudioService {
  private readonly elements = new Map<string, HTMLAudioElement>();

  preload(id: string, src: string): void {
    if (typeof window === "undefined" || this.elements.has(id)) return;
    const element = new Audio(src);
    element.preload = "auto";
    this.elements.set(id, element);
  }

  play(id: string, options?: AudioPlayOptions): void {
    const element = this.elements.get(id);
    if (!element) return;
    element.loop = options?.loop ?? false;
    element.volume = options?.volume ?? 1;
    // A rejected `play()` promise (decode error, autoplay policy, etc.)
    // must fail silently -- it should never surface as an unhandled
    // rejection or break the calling feature's own state.
    element.play().catch(() => {});
  }

  stop(id: string): void {
    const element = this.elements.get(id);
    if (!element) return;
    element.pause();
    element.currentTime = 0;
  }

  stopAll(): void {
    for (const id of this.elements.keys()) this.stop(id);
  }

  setVolume(id: string, volume: number): void {
    const element = this.elements.get(id);
    if (!element) return;
    element.volume = Math.min(1, Math.max(0, volume));
  }
}

export const audioService: AudioService = new HtmlAudioService();
