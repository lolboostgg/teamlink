/**
 * Short synthesised cues, one per kind of event.
 *
 * No audio assets to ship: these are generated with the Web Audio API, which
 * keeps a handful of distinct sounds free of a handful of binary files.
 *
 * They are deliberately different shapes rather than the same chime at
 * different pitches — someone with the tab in the background should be able
 * to tell "a customer wrote to me" from "an order is waiting" without
 * looking. Rising means something arrived and is good; falling means
 * something needs a decision; the money cue is the only three-note one.
 */
type Tone = { freq: number; at: number; length?: number; gain?: number };

const CUES: Record<string, { tones: Tone[]; type?: OscillatorType }> = {
  // Two rising notes — the original, kept for a new order request.
  request: { tones: [{ freq: 880, at: 0 }, { freq: 1180, at: 0.12 }] },

  // Single soft blip: a message is frequent, so it has to be the least
  // intrusive thing in here.
  message: { tones: [{ freq: 660, at: 0, length: 0.16, gain: 0.1 }] },

  // Three rising notes, a little longer. Money arriving is the one moment
  // worth a flourish.
  tip: {
    tones: [
      { freq: 784, at: 0 },
      { freq: 1046, at: 0.1 },
      { freq: 1318, at: 0.2, length: 0.32 },
    ],
  },

  // Falling pair: something is being taken away and wants an answer.
  cancel: { tones: [{ freq: 660, at: 0 }, { freq: 440, at: 0.14, length: 0.3 }], type: "triangle" },

  // Neutral single note for everything else that reaches the bell.
  generic: { tones: [{ freq: 880, at: 0, length: 0.2 }] },
};

export type SoundName = keyof typeof CUES;

const MUTE_KEY = "teamlink-sounds-muted";
/** Fired when the preference changes, so a toggle anywhere on the page
 * updates every other copy of it. */
export const SOUND_PREF_EVENT = "teamlink-sound-pref";

export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUTE_KEY) !== "1";
}

export function setSoundsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) window.localStorage.removeItem(MUTE_KEY);
  else window.localStorage.setItem(MUTE_KEY, "1");
  window.dispatchEvent(new CustomEvent(SOUND_PREF_EVENT));
}

export function playSound(name: SoundName = "generic") {
  if (typeof window === "undefined") return;
  // Checked here rather than at each call site: there are half a dozen of
  // them across three screens, and one that forgets is the whole point of
  // the switch defeated.
  if (!soundsEnabled()) return;
  const Ctx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  const cue = CUES[name] ?? CUES.generic;

  // A context per cue, closed straight after. Browsers cap how many can be
  // open at once, and these fire from several independent places.
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return;
  }

  const now = ctx.currentTime;
  let end = now;

  for (const tone of cue.tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cue.type ?? "sine";
    osc.frequency.value = tone.freq;

    const start = now + tone.at;
    const length = tone.length ?? 0.22;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(tone.gain ?? 0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
    end = Math.max(end, start + length);
  }

  setTimeout(() => void ctx.close(), (end - now) * 1000 + 300);
}

/** The original two-tone chime, kept so existing callers keep working. */
export function playNotificationSound() {
  playSound("request");
}
