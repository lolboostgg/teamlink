"use client";

import Link from "next/link";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/language/LanguageSwitcher";
import { useRole } from "@/components/role/RoleProvider";
import { getRoleMeta } from "@/lib/roles";

export function HeaderUtilities() {
  const { role } = useRole();
  const roleMeta = getRoleMeta(role);

  return (
    <div className="header-utilities">
      <CurrencySwitcher />
      <LanguageSwitcher />
      <Link
        href={roleMeta.href}
        className="btn btn--outline btn--sm header-utilities__dashboard"
        transitionTypes={["dashboard-enter"]}
      >
        <i className="fa-solid fa-gauge" aria-hidden="true" />
        Dashboard
      </Link>
    </div>
  );
}
