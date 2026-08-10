// Site-wide dark "space" backdrop — mounted once in the root layout so it
// sits behind marketing, checkout, and dashboard pages alike (see the
// .starfield rules in globals.css for why this is what makes the whole
// product read as one consistent place instead of separate screens).
export function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      <div className="starfield__nebula starfield__nebula--blue" />
      <div className="starfield__nebula starfield__nebula--violet" />
      <div className="starfield__layer starfield__layer--sm" />
      <div className="starfield__layer starfield__layer--lg" />
      <div className="starfield__depth" />
    </div>
  );
}
