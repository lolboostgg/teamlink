"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlinkDiscord } from "@/app/actions/discord";
import { useToast } from "@/components/ui/ToastProvider";
import { discordAvatarUrl } from "@/lib/discord";

export interface DiscordConnectionProps {
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  /** Where Discord should send the user back to after consent. */
  returnTo: string;
  /** `?discord=` value the callback appended, so we can report the outcome. */
  status?: string;
}

const STATUS_MESSAGES: Record<string, { text: string; tone: "success" | "error" }> = {
  linked: { text: "Discord connected.", tone: "success" },
  cancelled: { text: "Discord connection cancelled.", tone: "error" },
  already_linked: { text: "That Discord account is already linked to another QUP.gg account.", tone: "error" },
  invalid_state: { text: "That link expired — please try again.", tone: "error" },
  not_configured: { text: "Discord isn't set up on the server yet.", tone: "error" },
  error: { text: "Couldn't reach Discord. Please try again.", tone: "error" },
};

/**
 * The connect / disconnect row for a Discord account. Shared between the
 * client settings page and the teammate connections page — both write to the
 * same User columns.
 */
export function DiscordConnection({ discordId, discordUsername, discordAvatar, returnTo, status }: DiscordConnectionProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const avatar = discordAvatarUrl(discordId, discordAvatar);

  useEffect(() => {
    if (!status) return;
    const message = STATUS_MESSAGES[status];
    if (message) showToast(message.text, message.tone);
    // Drop the query param so a refresh doesn't replay the toast.
    router.replace(returnTo);
  }, [status, showToast, router, returnTo]);

  function handleUnlink() {
    startTransition(async () => {
      try {
        await unlinkDiscord();
        showToast("Discord disconnected.", "success");
      } catch {
        showToast("Couldn't disconnect Discord.", "error");
      }
    });
  }

  return (
    <div className="settings-row">
      <div className="settings-row__brand">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="settings-row__avatar" src={avatar} alt="" />
        ) : (
          <span className="settings-row__logo settings-row__logo--discord">
            <i className="fa-brands fa-discord" aria-hidden="true" />
          </span>
        )}
        <div>
          <strong>Discord</strong>
          <span>
            {discordId
              ? `Connected as ${discordUsername ?? discordId}`
              : "Not connected — link it to get order updates on Discord"}
          </span>
        </div>
      </div>

      {discordId ? (
        <div className="settings-row__actions">
          <span className="dashboard-pill dashboard-pill--success">connected</span>
          <a className="btn btn--ghost btn--sm" href={`/api/discord/link?returnTo=${encodeURIComponent(returnTo)}`}>
            Reconnect
          </a>
          <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={handleUnlink}>
            Disconnect
          </button>
        </div>
      ) : (
        <a className="btn btn--vivid btn--sm" href={`/api/discord/link?returnTo=${encodeURIComponent(returnTo)}`}>
          <i className="fa-brands fa-discord" aria-hidden="true" /> Connect Discord
        </a>
      )}
    </div>
  );
}
