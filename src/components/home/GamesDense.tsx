import { Reveal } from "@/components/ui/Reveal";
import { GamesPageSlider } from "@/components/home/GamesPageSlider";
import { GAMES } from "@/lib/games";

// Same big-card slider treatment as the hero carousel / booking-page
// switcher, rather than a static grid — keeps this section scannable
// without pushing every game onto the screen at once.
export function GamesDense() {
  return (
    <section className="section" id="games">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">Popular games</div>
            <h2 className="section__title">One platform for every game.</h2>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <GamesPageSlider games={GAMES} />
        </Reveal>
      </div>
    </section>
  );
}
