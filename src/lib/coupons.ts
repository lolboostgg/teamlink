"use client";

import { useEffect, useState } from "react";
import { listMyCoupons, type CouponView } from "@/app/actions/coupons";

/**
 * The customer's coupons, from their account.
 *
 * The old store kept these in localStorage, so a code lived in one browser
 * and could be spent again by clearing site data. Issuing and redeeming are
 * both server-side now (see lib/couponsServer.ts) — this is only the read.
 */

export type Coupon = CouponView;

export function useCoupons(): Coupon[] {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listMyCoupons().then((rows) => {
      if (!cancelled) setCoupons(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return coupons;
}
