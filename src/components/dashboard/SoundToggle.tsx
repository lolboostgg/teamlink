"use client";

import { useEffect, useState } from "react";
import { playSound, soundsEnabled, setSoundsEnabled, SOUND_PREF_EVENT } from "@/lib/notificationSound";

/**
 * Mute switch for the notification cues, in the dashboard header.
 *
 * Sounds without a way to turn them off are the surest way to get someone to
 * mute the whole tab — and then miss the ones that mattered. It sits next to
 * the bell because that is where the other "how do I hear about things"
 * control already is.
 *
 * The preference lives in localStorage rather than on the account: it is
 * about this device (an office, a stream, a shared room), not about the
 * person. Someone streaming on one machine still wants the alert on their
 * phone.
 */
export function SoundToggle() {
  // Starts enabled and corrects on mount: localStorage does not exist during
  // the server render, and guessing wrong here would mean a hydration
  // mismatch on every load.
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(soundsEnabled());
    sync();
    window.addEventListener(SOUND_PREF_EVENT, sync);
    // Another tab changing it counts too.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOUND_PREF_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    const next = !enabled;
    setSoundsEnabled(next);
    setEnabled(next);
    // Turning them back on plays the cue it just re-enabled, so you hear
    // what you agreed to rather than trusting the icon.
    if (next) playSound("message");
  }

  return (
    // Labelled rather than an icon alone: a speaker glyph with a slash
    // through it is easy to misread as "the sound is broken" instead of "you
    // switched it off", and this is a setting people will look for.
    <button
      type="button"
      className={`sound-toggle${enabled ? " is-on" : " is-muted"}`}
      onClick={toggle}
      role="switch"
      aria-checked={enabled}
      aria-label="Notification sounds"
    >
      <i className={enabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark"} aria-hidden="true" />
      <span className="sound-toggle__label">Sound</span>
      <span className="sound-toggle__state">{enabled ? "On" : "Off"}</span>
    </button>
  );
}
