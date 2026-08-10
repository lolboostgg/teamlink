"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { IconSelect } from "@/components/ui/IconSelect";
import { createSanction } from "@/app/dashboard/admin/sanctions/actions";

type TeammateOption = { id: string; name: string; teammateNo: number; avatarUrl: string | null };

const SANCTION_TYPES = [
  { value: "WARNING", label: "Warning", glyph: "fa-solid fa-triangle-exclamation" },
  { value: "TEMP_SUSPENSION", label: "Temporary suspension", glyph: "fa-solid fa-clock" },
  { value: "BAN", label: "Ban", glyph: "fa-solid fa-ban" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="btn btn--vivid btn--sm" disabled={pending}>{pending ? "Applying…" : "Apply sanction"}</button>;
}

export function SanctionCreateForm({ teammates }: { teammates: TeammateOption[] }) {
  const [teammateId, setTeammateId] = useState<string | null>(null);
  const [type, setType] = useState("WARNING");
  const teammateOptions = teammates.map((teammate) => ({
    value: teammate.id,
    label: `${teammate.name} · #${teammate.teammateNo}`,
    icon: teammate.avatarUrl || "/avatars/default.webp",
  }));

  return <form action={createSanction} className="ops-create-form sanction-create-form">
    <input type="hidden" name="teammateId" value={teammateId ?? ""}/>
    <input type="hidden" name="type" value={type}/>
    <IconSelect label="Teammate" value={teammateId} options={teammateOptions} placeholder="Choose teammate" searchable onChange={setTeammateId}/>
    <IconSelect label="Sanction type" value={type} options={SANCTION_TYPES} onChange={(value) => value && setType(value)}/>
    <label className="sanction-create-form__field"><span>Duration</span><span className="sanction-create-form__input"><input name="hours" type="number" min="1" defaultValue="24"/><small>hours</small></span></label>
    <label className="sanction-create-form__field"><span>Reason</span><input name="reason" required placeholder="Reason shown in history"/></label>
    <label className="sanction-create-form__field"><span>Internal note</span><input name="internalNote" placeholder="Only admins can see this"/></label>
    <SubmitButton />
  </form>;
}
