"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  conversationPref: string | null;
  playStylePref: string | null;
  onSave: (prefs: { conversationPref: string; playStylePref: string }) => void;
}

export const NO_PREFERENCE = "No preference";
export const CONVERSATION_OPTIONS = ["Quiet or no voice chat", "Talkative", "Gameplay-related", NO_PREFERENCE];
export const PLAY_STYLE_OPTIONS = ["Give me ganks", "Support me", "For fun", "Serious", NO_PREFERENCE];

/**
 * One group of choices, with the opt-out kept apart from them.
 *
 * "No preference" was the last chip in the same wrapping row as the real
 * answers, which put it alone on a second line in both groups — and made an
 * opt-out look like a fifth thing you might want. The answers sit in an even
 * grid; the opt-out sits under them, quieter, as the thing you pick when none
 * of the above applies.
 */
function PrefGroup({
  label,
  icon,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: string;
  name: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const choices = options.filter((option) => option !== NO_PREFERENCE);

  return (
    <div className="preferences-modal__section">
      <span className="preferences-modal__section-label">
        <i className={icon} aria-hidden="true" /> {label}
      </span>

      <div className="pref-choices">
        {choices.map((option) => (
          <label key={option} className="chip-check pref-choice">
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
            {option}
          </label>
        ))}
      </div>

      <label className="chip-check pref-choice pref-choice--none">
        <input
          type="radio"
          name={name}
          checked={value === NO_PREFERENCE}
          onChange={() => onChange(NO_PREFERENCE)}
        />
        {NO_PREFERENCE}
      </label>
    </div>
  );
}

// Both groups as pills on one flat panel — the old version buried each
// choice behind its own sub-screen, which meant two taps and a "Save" just
// to flip one preference. Draft state lives here and only reaches the
// order (and therefore the teammate-facing chat) once "Confirm" is hit.
export function PreferencesModal({ open, onClose, conversationPref, playStylePref, onSave }: Props) {
  const [draftConversation, setDraftConversation] = useState(conversationPref ?? CONVERSATION_OPTIONS[0]);
  const [draftPlayStyle, setDraftPlayStyle] = useState(playStylePref ?? PLAY_STYLE_OPTIONS[3]);

  function handleConfirm() {
    onSave({ conversationPref: draftConversation, playStylePref: draftPlayStyle });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="preferences-modal-title">
      <div className="preferences-modal">
        <span className="modal-icon modal-icon--accent" aria-hidden="true">
          <i className="fa-solid fa-sliders" />
        </span>
        <h2 id="preferences-modal-title" className="preferences-modal__title preferences-modal__title--center">
          Preferences
        </h2>
        <p className="preferences-modal__sub preferences-modal__sub--center">
          Your teammate will be notified and may be able to accommodate your preferences.
        </p>

        <PrefGroup
          label="Conversation"
          icon="fa-solid fa-comments"
          name="conversation"
          options={CONVERSATION_OPTIONS}
          value={draftConversation}
          onChange={setDraftConversation}
        />

        <PrefGroup
          label="Play style"
          icon="fa-solid fa-gamepad"
          name="playstyle"
          options={PLAY_STYLE_OPTIONS}
          value={draftPlayStyle}
          onChange={setDraftPlayStyle}
        />

        <button type="button" className="btn btn--vivid btn--block preferences-modal__confirm" onClick={handleConfirm}>
          Confirm preferences
        </button>
      </div>
    </Modal>
  );
}
