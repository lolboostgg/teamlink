interface Props {
  seed: string;
}

// Placeholder avatar — every teammate/user avatar in the app renders this
// same default image for now (no per-person photos yet). `seed` is kept in
// the prop signature so call sites don't need to change once real avatars
// (keyed by teammate/user id) replace this.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AvatarIcon({ seed }: Props) {
  return (
    <span className="avatar-icon">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/avatars/default.webp" alt="" />
    </span>
  );
}
