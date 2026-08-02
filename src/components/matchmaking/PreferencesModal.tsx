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

type Step = "main" | "conversation" | "playstyle";

// Two-level flow matching the reference: a main panel showing the current
// Conversation / Play style picks, each opening its own radio-list
// sub-panel. Draft state lives here and only reaches the order (and
// therefore the teammate-facing chat) once "Confirm preferences" is hit.
export function PreferencesModal({ open, onClose, conversationPref, playStylePref, onSave }: Props) {
  const [step, setStep] = useState<Step>("main");
  const [draftConversation, setDraftConversation] = useState(conversationPref ?? CONVERSATION_OPTIONS[0]);
  const [draftPlayStyle, setDraftPlayStyle] = useState(playStylePref ?? PLAY_STYLE_OPTIONS[3]);

  function handleClose() {
    setStep("main");
    onClose();
  }

  function handleConfirm() {
    onSave({ conversationPref: draftConversation, playStylePref: draftPlayStyle });
    setStep("main");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy="preferences-modal-title">
      {step === "main" && (
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

          <button type="button" className="preferences-modal__row" onClick={() => setStep("conversation")}>
            <span>
              <i className="fa-solid fa-comments" aria-hidden="true" /> Conversation
            </span>
            <span className="preferences-modal__row-value">
              {draftConversation} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </span>
          </button>

          <button type="button" className="preferences-modal__row" onClick={() => setStep("playstyle")}>
            <span>
              <i className="fa-solid fa-gamepad" aria-hidden="true" /> Play style
            </span>
            <span className="preferences-modal__row-value">
              {draftPlayStyle} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </span>
          </button>

          <button type="button" className="btn btn--vivid btn--block preferences-modal__confirm" onClick={handleConfirm}>
            Confirm preferences
          </button>
        </div>
      )}

      {step === "conversation" && (
        <div className="preferences-modal preferences-modal--sub">
          <button type="button" className="preferences-modal__back" onClick={() => setStep("main")} aria-label="Back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          </button>
          <span className="modal-icon modal-icon--accent" aria-hidden="true">
            <i className="fa-solid fa-comments" />
          </span>
          <h2 className="preferences-modal__title preferences-modal__title--center">Conversation</h2>
          <div className="preferences-modal__options">
            {CONVERSATION_OPTIONS.map((opt) => (
              <label key={opt} className="preferences-modal__option">
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
          <button type="button" className="btn btn--vivid btn--block" onClick={() => setStep("main")}>
            Save
          </button>
        </div>
      )}

      {step === "playstyle" && (
        <div className="preferences-modal preferences-modal--sub">
          <button type="button" className="preferences-modal__back" onClick={() => setStep("main")} aria-label="Back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          </button>
          <span className="modal-icon modal-icon--accent" aria-hidden="true">
            <i className="fa-solid fa-gamepad" />
          </span>
          <h2 className="preferences-modal__title preferences-modal__title--center">Play style</h2>
          <div className="preferences-modal__options">
            {PLAY_STYLE_OPTIONS.map((opt) => (
              <label key={opt} className="preferences-modal__option">
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
          <button type="button" className="btn btn--vivid btn--block" onClick={() => setStep("main")}>
            Save
          </button>
        </div>
      )}
    </Modal>
  );
}
