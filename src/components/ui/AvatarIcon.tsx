import { avatarFrameStyle, type AvatarFrame } from "@/lib/avatarFrame";

interface Props {
  seed: string;
  avatarUrl?: string | null;
  frame?: AvatarFrame | null;
}

// Renders the real profile picture (with its saved crop/zoom framing) when
// one is known; falls back to the site placeholder otherwise. `seed` is kept
// in the prop signature for call sites that only have an id to identify
// whose avatar this is, even when no photo is available yet.
export function AvatarIcon({ avatarUrl, frame }: Props) {
  const safeSrc = avatarUrl?.startsWith("data:image/") && avatarUrl.length <= 2_000 ? null : avatarUrl;
  return (
    <span className="avatar-icon">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={safeSrc || "/avatars/default.webp"}
        alt=""
        style={frame ? avatarFrameStyle(frame) : undefined}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith("/avatars/default.webp")) event.currentTarget.src = "/avatars/default.webp";
        }}
      />
    </span>
  );
}
