"use client";

import { useState, useTransition } from "react";
import { ClientProfileForm } from "@/components/dashboard/client/ClientProfileForm";
import { DiscordConnection } from "@/components/dashboard/DiscordConnection";
import { saveNotificationPrefs } from "@/app/(marketing)/dashboard/client/settings/actions";
import { useToast } from "@/components/ui/ToastProvider";
import {
  NOTIFICATION_TOPICS,
  NOTIFICATION_CHANNELS,
  CHANNEL_META,
  type NotificationChannel,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";

type Section = "profile" | "notifications" | "connections" | "security";

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "profile", label: "Profile", icon: "fa-solid fa-circle-user" },
  { key: "notifications", label: "Notifications", icon: "fa-solid fa-bell" },
  { key: "connections", label: "Connected accounts", icon: "fa-solid fa-link" },
  { key: "security", label: "Security", icon: "fa-solid fa-shield-halved" },
];

export interface SettingsProps {
  accountNo: number;
  name: string;
  email: string;
  avatarUrl: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  /** `?discord=` outcome from the OAuth callback, if we just came back. */
  discordStatus?: string;
  prefs: NotificationPrefs;
  loginActivity: { ip: string; device: string; location: string; current: boolean }[];
}

export function SettingsScreen({ account }: { account: SettingsProps }) {
  // Land straight on Connected accounts when we're returning from Discord,
  // otherwise the result toast fires on a section the user isn't looking at.
  const [section, setSection] = useState<Section>(account.discordStatus ? "connections" : "profile");

  return (
    <div className="settings-screen">
      <aside className="settings-screen__nav">
        <h2 className="settings-screen__title">Settings</h2>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`settings-nav-item${section === s.key ? " is-active" : ""}`}
            onClick={() => setSection(s.key)}
          >
            <i className={s.icon} aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </aside>

      <div className="settings-screen__body">
        {section === "profile" && <ProfileSection account={account} />}
        {section === "notifications" && <NotificationsSection initial={account.prefs} discordId={account.discordId} />}
        {section === "connections" && <ConnectionsSection account={account} />}
        {section === "security" && <SecuritySection activity={account.loginActivity} />}
      </div>
    </div>
  );
}

function ProfileSection({ account }: { account: SettingsProps }) {
  return (
    <>
      <header className="settings-head">
        <h3>Profile</h3>
      </header>

      <div className="settings-identity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={account.avatarUrl || "/avatars/default.webp"} alt="" />
        <div>
          <strong>
            {account.name || account.email.split("@")[0]} <span>#{account.accountNo}</span>
          </strong>
          <span>{account.email}</span>
        </div>
      </div>

      <ClientProfileForm
        initial={{ name: account.name, email: account.email, avatarUrl: account.avatarUrl }}
        section="both"
      />
    </>
  );
}

function NotificationsSection({
  initial,
  discordId,
}: {
  initial: NotificationPrefs;
  discordId: string | null;
}) {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(topic: string, channel: NotificationChannel) {
    const next = {
      ...prefs,
      [topic]: { ...prefs[topic], [channel]: !prefs[topic]?.[channel] },
    };
    setPrefs(next);
    startTransition(async () => {
      try {
        await saveNotificationPrefs(next);
      } catch {
        setPrefs(prefs);
        showToast("Couldn't save that setting.", "error");
      }
    });
  }

  return (
    <>
      <header className="settings-head">
        <h3>Notifications</h3>
        <div className="settings-channels">
          {NOTIFICATION_CHANNELS.map((c) => (
            <span key={c}>
              <i className={CHANNEL_META[c].icon} aria-hidden="true" />
              {CHANNEL_META[c].label}
            </span>
          ))}
        </div>
      </header>

      <div className="settings-rows">
        {NOTIFICATION_TOPICS.map((topic) => (
          <div className="settings-row" key={topic.key}>
            <div>
              <strong>{topic.label}</strong>
              <span>{topic.description}</span>
            </div>
            <div className="settings-row__channels">
              {NOTIFICATION_CHANNELS.map((channel) => {
                const on = prefs[topic.key]?.[channel] ?? false;
                return (
                  <button
                    key={channel}
                    type="button"
                    className={`channel-toggle${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    aria-label={`${CHANNEL_META[channel].label} for ${topic.label}`}
                    disabled={pending}
                    onClick={() => toggle(topic.key, channel)}
                  >
                    <i className={CHANNEL_META[channel].icon} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="settings-note">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        {discordId
          ? "Discord notifications go to the account linked under Connected accounts."
          : "Link your Discord account under Connected accounts to receive Discord notifications."}
      </p>

      <p className="settings-note">
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> These preferences are stored, but no
        delivery is wired up yet — nothing is sent on any channel so far.
      </p>
    </>
  );
}

function ConnectionsSection({ account }: { account: SettingsProps }) {
  return (
    <>
      <header className="settings-head">
        <h3>Connected accounts</h3>
      </header>

      <div className="settings-rows">
        <DiscordConnection
          discordId={account.discordId}
          discordUsername={account.discordUsername}
          discordAvatar={account.discordAvatar}
          returnTo="/dashboard/client/settings"
          status={account.discordStatus}
        />

        <div className="settings-row">
          <div className="settings-row__brand">
            <span className="settings-row__logo settings-row__logo--google">
              <i className="fa-brands fa-google" aria-hidden="true" />
            </span>
            <div>
              <strong>Google</strong>
              <span>Sign-in works, but the link isn&rsquo;t stored on the account yet</span>
            </div>
          </div>
          <span className="dashboard-pill dashboard-pill--muted">not tracked</span>
        </div>
      </div>
    </>
  );
}

function SecuritySection({ activity }: { activity: SettingsProps["loginActivity"] }) {
  return (
    <>
      <header className="settings-head">
        <h3>Security</h3>
      </header>

      <div className="settings-rows">
        <div className="settings-row">
          <div className="settings-row__brand">
            <span className="settings-row__logo">
              <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
            </span>
            <div>
              <strong>Two-factor authentication</strong>
              <span>Not available yet</span>
            </div>
          </div>
          <span className="dashboard-pill dashboard-pill--muted">coming soon</span>
        </div>

        <div className="security-logins">
          <div className="security-logins__head"><strong>Login activity</strong><span>Devices currently accessing your account</span></div>
          {activity.map((login, index) => <div className="security-login" key={`${login.ip}-${index}`}>
            <span className="settings-row__logo"><i className="fa-solid fa-desktop" aria-hidden="true" /></span>
            <span><strong>{login.device}</strong><small>{login.location}</small></span>
            <span><strong>{login.ip}</strong><small>IP address</small></span>
            <span className="dashboard-pill dashboard-pill--success">{login.current ? "Active now" : "Previous"}</span>
          </div>)}
        </div>
      </div>
    </>
  );
}
