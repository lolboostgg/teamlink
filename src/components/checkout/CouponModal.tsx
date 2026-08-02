"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCoupons, findCoupon, type Coupon } from "@/lib/coupons";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (coupon: Coupon) => void;
}

// Coupons are generated for real (see SessionScreen's "10% off" code,
// stored via addCoupon) but nothing previously let you redeem one — this
// is that missing redemption step: pick from your own available codes, or
// type any code in directly. Same-browser-only, like the rest of the
// matchmaking/order simulation this coupon store rides alongside.
export function CouponModal({ open, onClose, onApply }: Props) {
  const coupons = useCoupons();
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleApply(coupon: Coupon) {
    onApply(coupon);
    onClose();
  }

  function handleApplyManual() {
    setError(null);
    const code = manualCode.trim();
    if (!code) return;
    const found = findCoupon(code);
    if (!found) {
      setError("That code doesn't exist or isn't valid in this browser.");
      return;
    }
    if (found.usedAt) {
      setError("That code has already been used.");
      return;
    }
    handleApply(found);
    setManualCode("");
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="coupon-modal-title">
      <div className="coupon-modal">
        <h2 id="coupon-modal-title" className="coupon-modal__title">
          Apply a coupon
        </h2>

        {coupons.length > 0 && (
          <div className="coupon-modal__list">
            {coupons.map((c) => (
              <div className="coupon-modal__row" key={c.code}>
                <div>
                  <span className="coupon-modal__code">{c.code}</span>
                  <span className="coupon-modal__discount">−{c.discountPercent}%</span>
                </div>
                <button type="button" className="btn btn--vivid btn--sm" onClick={() => handleApply(c)}>
                  Apply
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="coupon-modal__manual">
          <label htmlFor="coupon-manual-input">{coupons.length > 0 ? "Or enter a code" : "Enter a coupon code"}</label>
          <div className="coupon-modal__manual-row">
            <input
              id="coupon-manual-input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="TL10-XXXXXX"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyManual();
                }
              }}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleApplyManual}>
              Apply
            </button>
          </div>
          {error && (
            <p className="form-row__error">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
            </p>
          )}
          {coupons.length === 0 && (
            <p className="coupon-modal__empty-note">
              No saved coupons yet — you get one automatically after completing a session.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
