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

const CONVERSATION_OPTIONS = ["Quiet or no voice chat", "Talkative", "Gameplay-related", "No preference"];
const PLAY_STYLE_OPTIONS = ["Give me ganks", "Support me", "For fun", "Serious", "No preference"];

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

        <div className="preferences-modal__section">
          <span className="preferences-modal__section-label">
            <i className="fa-solid fa-comments" aria-hidden="true" /> Conversation
          </span>
          <div className="chip-check-group">
            {CONVERSATION_OPTIONS.map((opt) => (
              <label key={opt} className="chip-check">
                <input
                  type="radio"
                  name="conversation"
                  checked={draftConversation === opt}
                  onChange={() => setDraftConversation(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="preferences-modal__section">
          <span className="preferences-modal__section-label">
            <i className="fa-solid fa-gamepad" aria-hidden="true" /> Play style
          </span>
          <div className="chip-check-group">
            {PLAY_STYLE_OPTIONS.map((opt) => (
              <label key={opt} className="chip-check">
                <input
                  type="radio"
                  name="playstyle"
                  checked={draftPlayStyle === opt}
                  onChange={() => setDraftPlayStyle(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn--vivid btn--block preferences-modal__confirm" onClick={handleConfirm}>
          Confirm preferences
        </button>
      </div>
    </Modal>
  );
}
