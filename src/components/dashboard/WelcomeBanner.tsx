import Link from "next/link";

interface QuickLink {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  name: string;
  message: string;
  links?: QuickLink[];
}

export function WelcomeBanner({ name, message, links }: Props) {
  return (
    <div className="welcome-banner">
      <div>
        <div className="welcome-banner__eyebrow">Welcome back</div>
        <h1 className="welcome-banner__title">{name}</h1>
        <p className="welcome-banner__sub">{message}</p>
      </div>

      {links && links.length > 0 && (
        <div className="welcome-banner__links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="welcome-banner__link">
              <i className={link.icon} aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
