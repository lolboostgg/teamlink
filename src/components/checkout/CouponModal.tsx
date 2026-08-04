"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCoupons, type Coupon } from "@/lib/coupons";
import { checkCoupon } from "@/app/actions/coupons";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (coupon: Coupon) => void;
}

// Pick from the codes on your account, or type one in. The check is a
// server call: which codes exist, who owns them and whether they are still
// open is not something the browser gets to decide. It is only a preview —
// checkout validates and burns the code again when it places the order.
export function CouponModal({ open, onClose, onApply }: Props) {
  const coupons = useCoupons();
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  function handleApply(coupon: Coupon) {
    onApply(coupon);
    onClose();
  }

  async function handleApplyManual() {
    setError(null);
    const code = manualCode.trim();
    if (!code) return;
    setChecking(true);
    const found = await checkCoupon(code);
    setChecking(false);
    if (!found) {
      setError("That code isn't valid, has already been used, or has expired.");
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
                  void handleApplyManual();
                }
              }}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void handleApplyManual()} disabled={checking}>
              {checking ? "Checking..." : "Apply"}
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
