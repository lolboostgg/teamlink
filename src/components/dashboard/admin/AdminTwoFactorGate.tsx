"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { beginTwoFactorSetup, enableTwoFactor } from "@/app/(marketing)/dashboard/client/settings/actions";

export function AdminTwoFactorGate() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <main className="admin-security-gate"><div className="dashboard-panel"><i className="fa-solid fa-shield-halved"/><h1>Secure your admin account</h1><p>Two-factor authentication is required before this account can access administration tools.</p>
    {!secret ? <button className="btn btn--vivid" disabled={pending} onClick={() => startTransition(async () => { try { setSecret((await beginTwoFactorSetup()).secret); } catch (e) { setError(e instanceof Error ? e.message : "Setup failed."); } })}>Set up authenticator</button> : <div className="two-factor-setup"><p>Add this key to your authenticator app, then enter the current code.</p><code>{secret}</code><div><input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000"/><button className="btn btn--vivid" disabled={pending || code.length !== 6} onClick={() => startTransition(async () => { try { await enableTwoFactor({ secret, code }); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Code rejected."); } })}>Enable 2FA</button></div></div>}
    {error && <p className="form-error">{error}</p>}
  </div></main>;
}
