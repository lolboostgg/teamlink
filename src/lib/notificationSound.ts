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

/**
 * Cues that have a real recording behind them.
 *
 * The synthesised tones below are fine for the small stuff, but the order
 * alert is the one sound that has to cut through a game, a voice call and a
 * stream — that wants an actual sound designed for it, not two sine waves.
 * Anything not listed here still falls back to the generated cue, and so does
 * this one if the file can't be played.
 */
const RECORDINGS: Partial<Record<SoundName, string>> = {
  request: "/sounds/neworder.mp3",
};

// One element per cue, reused. A fresh Audio per play re-fetches the file on
// some browsers, and this one repeats every few seconds while an alert is up.
const players = new Map<string, HTMLAudioElement>();

function playRecording(src: string): boolean {
  try {
    let audio = players.get(src);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = "auto";
      players.set(src, audio);
    }
    // Rewound rather than layered: the repeat should sound like the same
    // alert going again, not like three of them piling up.
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Autoplay refused, or the file is missing. Nothing to do here — the
      // synthesised cue below has already been skipped, and forcing it would
      // be refused for the same reason.
    });
    return true;
  } catch {
    return false;
  }
}

export function playSound(name: SoundName = "generic") {
  if (typeof window === "undefined") return;
  // Checked here rather than at each call site: there are half a dozen of
  // them across three screens, and one that forgets is the whole point of
  // the switch defeated.
  if (!soundsEnabled()) return;

  const recording = RECORDINGS[name];
  if (recording && playRecording(recording)) return;
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
