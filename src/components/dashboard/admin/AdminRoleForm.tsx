"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { IconSelect } from "@/components/ui/IconSelect";
import { setAdminRole } from "@/app/dashboard/admin/staff/actions";

const ROLE_OPTIONS = [
  { value: "SUPPORT", label: "Support", glyph: "fa-solid fa-headset" },
  { value: "OPERATIONS", label: "Operations", glyph: "fa-solid fa-satellite-dish" },
  { value: "FINANCE", label: "Finance", glyph: "fa-solid fa-coins" },
  { value: "SUPERADMIN", label: "Superadmin", glyph: "fa-solid fa-crown" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="btn btn--vivid btn--sm" disabled={pending}>{pending ? "Saving…" : "Change role"}</button>;
}

export function AdminRoleForm({ userId, initialRole, disabled = false }: { userId: string; initialRole: string; disabled?: boolean }) {
  const [role, setRole] = useState(initialRole);
  const currentRole = ROLE_OPTIONS.find((option) => option.value === role);
  return <form action={setAdminRole} className="admin-ticket__form admin-role-form">
    <input type="hidden" name="userId" value={userId}/>
    <input type="hidden" name="adminRole" value={role}/>
    {disabled
      ? <span className="status-pill"><i className={currentRole?.glyph} aria-hidden="true" /> {currentRole?.label ?? role}</span>
      : <IconSelect label="Admin role" value={role} options={ROLE_OPTIONS} onChange={(value) => value && setRole(value)}/>}
    {!disabled && <SubmitButton />}
  </form>;
}
