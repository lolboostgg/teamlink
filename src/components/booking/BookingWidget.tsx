"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { CheckoutIngameStep, type IngameIdentity } from "@/components/checkout/CheckoutIngameStep";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import {
  getBookingCategories,
  CATEGORY_COLORS,
  rankPriceMultiplier,
  addonAdjustedUnitPrice,
  addonRunCount,
  describeAddons,
  encodeAddons,
  normalizeAddons,
  type AddonSelection,
  type BookingOption,
} from "@/lib/bookingOptions";
import { listGameAccounts } from "@/app/actions/gameAccounts";
import { BookingAddonSelect } from "@/components/booking/BookingAddonSelect";
import { Reveal } from "@/components/ui/Reveal";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PriceTag } from "@/components/currency/PriceTag";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { TrustPoints, PaymentStrip } from "@/components/ui/TrustPoints";
import { gameIcon } from "@/lib/gameArt";
import { FAQ_ITEMS } from "@/lib/content";
import { useLanguage } from "@/components/language/LanguageProvider";
import { getBookingCopy, localizeBookingValue } from "@/lib/bookingLocale";

interface Props {
  game: Game;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Team Up": "fa-solid fa-user-group",
  Ranked: "fa-solid fa-trophy",
  Social: "fa-solid fa-comments",
  Coaching: "fa-solid fa-chalkboard-user",
};

// One extra, mode-relevant question on top of the general FAQ_ITEMS —
// answers the thing someone picking *this specific* category is actually
// wondering about, not just the generic booking questions everyone gets.
const CATEGORY_FAQ: Record<string, { q: string; a: string }> = {
  "Team Up": {
    q: "What rank will my teammate be?",
    a: "Diamond+ for Duo, Grandmaster+ for Duo Pro — you'll see their exact rank before the session starts.",
  },
  Ranked: {
    q: "Does this affect my rank or get me banned?",
    a: "Your teammate queues alongside you exactly like a friend would — nothing about how ranked matchmaking works is bypassed.",
  },
  Social: {
    q: "Is there any rank requirement to join?",
    a: "No — Hangout and ARAM sessions are just company for a relaxed game, any rank welcome.",
  },
  Coaching: {
    q: "How does a coaching session work?",
    a: "Your coach reviews your gameplay live on voice or text and helps you improve in real time, not just after the fact.",
  },
};

// Which specific teammate you get is decided by the live dispatch/pick flow
// after checkout (see MatchmakingScreen), not up front — this widget only
// books the game, mode and group size.
export function BookingWidget({ game }: Props) {
  const { language } = useLanguage();
  const copy = getBookingCopy(language);
  const router = useRouter();
  const bookingCategories = useMemo(() => getBookingCategories(game.slug), [game.slug]);
  const [activeCategory, setActiveCategory] = useState(bookingCategories[0].category);
  const [selected, setSelected] = useState<BookingOption>(bookingCategories[0].options[0]);
  const [groupSize, setGroupSize] = useState(1);
  // Defaulted rather than empty: every group's first choice is its free one,
  // so an untouched widget prices exactly like the mode's headline figure.
  const [addons, setAddons] = useState<AddonSelection>(() =>
    normalizeAddons(game.slug, bookingCategories[0].options[0].name, {}),
  );
  const visibleCategory = bookingCategories.find((cat) => cat.category === activeCategory) ?? bookingCategories[0];
  const [pulsing, setPulsing] = useState(false);
  const [ingameOpen, setIngameOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [pricingAccount, setPricingAccount] = useState<{ gameSlug: string; rank: string | null } | null>(null);
  const [openFaq, setOpenFaq] = useState(-1);
  const { status } = useSession();
  // An <option> holds text, not components, so the surcharge inside the
  // select is formatted with the same converter PriceTag renders through.
  const { format: formatPrice } = useCurrency();
  const firstRender = useRef(true);

  // This widget can stay mounted across a game switch (see games/[slug]/
  // layout.tsx) rather than remounting, so the category/mode picked for
  // the previous game has to be reset here — otherwise switching from LoL
  // to a game without a "Ranked" category could leave `selected` pointing
  // at an option that's no longer in the visible list at all.
  //
  // During render, not in an effect: the effect reset ran after the new game
  // had already painted once, so switching games flashed the previous game's
  // mode and price for a frame before correcting itself.
  const [bookedSlug, setBookedSlug] = useState(game.slug);
  if (bookedSlug !== game.slug) {
    setBookedSlug(game.slug);
    setActiveCategory(bookingCategories[0].category);
    setSelected(bookingCategories[0].options[0]);
    setGroupSize(1);
    setAddons(normalizeAddons(game.slug, bookingCategories[0].options[0].name, {}));
  }

  // Picking a 1-on-1 mode (Duo, Coach, ...) after having raised the group
  // size on a Flex-style mode must not silently keep booking (and pricing)
  // the old, higher count.
  function selectOption(option: BookingOption) {
    setSelected(option);
    setGroupSize((n) => Math.min(n, option.maxTeammates));
    // Answers are per mode. Carrying a keystone level onto an arena booking
    // would price a question that mode never asked.
    setAddons(normalizeAddons(game.slug, option.name, {}));
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    listGameAccounts(game.slug).then((accounts) => {
      if (!cancelled) setPricingAccount({ gameSlug: game.slug, rank: accounts[0]?.rank ?? null });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [game.slug, status, editAccountOpen]);

  const effectivePricingRank =
    status === "authenticated" && pricingAccount?.gameSlug === game.slug ? pricingAccount.rank : null;

  const total = useMemo(
    () =>
      addonAdjustedUnitPrice(game.slug, selected.name, addons) *
      groupSize *
      rankPriceMultiplier(game.slug, selected.name, effectivePricingRank),
    [game.slug, selected, groupSize, effectivePricingRank, addons],
  );

  // Small "flash" on the total whenever the selection changes, so the price
  // update reads as live/reactive rather than just appearing.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 260);
    return () => clearTimeout(t);
  }, [total]);

  // The in-game details are asked here rather than mid-checkout: it is the
  // one thing the customer has to look up, and finding out about it after
  // committing to a price is where people drop out.
  function goToCheckout(ingame?: IngameIdentity) {
    const checkoutTotal =
      addonAdjustedUnitPrice(game.slug, selected.name, addons) *
      groupSize *
      rankPriceMultiplier(game.slug, selected.name, ingame?.rank ?? effectivePricingRank);
    const params = new URLSearchParams({
      game: game.slug,
      option: selected.name,
      teammates: String(groupSize),
      total: checkoutTotal.toFixed(2),
    });
    const encodedAddons = encodeAddons(addons);
    if (encodedAddons) params.set("addons", encodedAddons);
    if (ingame) {
      params.set("ign", ingame.ign);
      params.set("region", ingame.region);
      if (ingame.roles.length > 0) params.set("roles", ingame.roles.join(","));
      if (ingame.rank) params.set("rank", ingame.rank);
      if (ingame.division) params.set("division", ingame.division);
    }
    router.push(`/checkout?${params.toString()}`);
  }

  const chosenAddons = describeAddons(game.slug, selected.name, addons);
  const runsBooked = addonRunCount(game.slug, selected.name, addons);

  const catColor = CATEGORY_COLORS[visibleCategory.category] ?? "var(--accent)";
  const categoryFaq = CATEGORY_FAQ[visibleCategory.category];
  const faqItems = categoryFaq ? [categoryFaq, ...FAQ_ITEMS] : FAQ_ITEMS;

  return (
    <>
    <div className="booking-layout" style={{ "--cat-color": catColor } as CSSProperties}>
      <div>
        {status === "authenticated" && (
          <Reveal>
            <button type="button" className="booking-edit-account" onClick={() => setEditAccountOpen(true)}>
              <span className="booking-edit-account__icon" aria-hidden="true">
                <i className="fa-solid fa-user-pen" />
              </span>
              <span className="booking-edit-account__copy">
                <strong>{copy.account}</strong>
                <small>{copy.accountHint}</small>
              </span>
              <i className="fa-solid fa-chevron-right booking-edit-account__go" aria-hidden="true" />
            </button>
          </Reveal>
        )}

        <Reveal>
          <span className="section__eyebrow booking-heading__eyebrow">{copy.book}</span>
        </Reveal>
        <Reveal delay={10}>
          <h2 className="section__title booking-heading__title">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gameIcon(game.slug)} alt="" className="booking-heading__game-icon" />
            {copy.choose}
          </h2>
        </Reveal>

        <Reveal delay={30}>
          <div className="booking-tabs" role="tablist">
            {bookingCategories.map((cat) => (
              <button
                key={cat.category}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat.category}
                className={`booking-tabs__tab${activeCategory === cat.category ? " is-active" : ""}`}
                onClick={() => setActiveCategory(cat.category)}
              >
                <i className={CATEGORY_ICONS[cat.category] ?? "fa-solid fa-gamepad"} aria-hidden="true" />
                {copy.categories[cat.category] ?? cat.category}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal key={visibleCategory.category} delay={40}>
          <div className="booking-category">
            {visibleCategory.options.map((option) => (
              // Shell rather than a single button: the teammate stepper below
              // is made of buttons, and a button inside a button is not valid
              // HTML — the browser closes the outer one early and the row
              // falls apart. The shell carries the card, the button is just
              // the clickable row inside it.
              <div
                key={option.name}
                className={`booking-option-shell${selected.name === option.name ? " is-selected" : ""}`}
              >
              <button
                type="button"
                className="booking-option"
                onClick={() => selectOption(option)}
                aria-pressed={selected.name === option.name}
              >
                {selected.name === option.name && (
                  <span className="booking-option__check" aria-hidden="true">
                    <i className="fa-solid fa-check" />
                  </span>
                )}
                <span className="booking-option__icon">
                  <i className={CATEGORY_ICONS[visibleCategory.category] ?? "fa-solid fa-gamepad"} aria-hidden="true" />
                </span>
                <span className="booking-option__main">
                  <span className="booking-option__name">
                    {option.name}
                    <InfoTooltip text={localizeBookingValue(language, option.description)} />
                  </span>
                  <span className="booking-option__desc">{localizeBookingValue(language, option.description)}</span>
                </span>
                <span className="booking-option__price">
                  <span className="booking-option__price-value">
                    <PriceTag amountEUR={option.price * rankPriceMultiplier(game.slug, option.name, effectivePricingRank)} />
                    <span className="booking-option__unit">{localizeBookingValue(language, option.unit)}</span>
                  </span>
                  <span className="booking-option__eta">
                    <span className="booking-option__eta-dot" aria-hidden="true" />
                    {localizeBookingValue(language, option.eta)}
                  </span>
                </span>
              </button>

              {/* What the mode still needs to know — keystone level, rating
                  bracket, bundle — asked on the row that was picked, so the
                  answer and the price it moves are never apart. */}
              {selected.name === option.name && (option.addons?.length ?? 0) > 0 && (
                <div className="booking-option__addons">
                  {(option.addons ?? []).map((group) => (
                    <div className="booking-addon" key={group.key}>
                      <span className="booking-addon__label">{localizeBookingValue(language, group.label)}</span>
                      {group.control === "select" ? (
                        <BookingAddonSelect
                          label={localizeBookingValue(language, group.label)}
                          choices={group.choices}
                          value={addons[group.key] ?? group.choices[0].value}
                          onChange={(next) => setAddons((current) => ({ ...current, [group.key]: next }))}
                          formatPrice={formatPrice}
                          localize={(text) => localizeBookingValue(language, text)}
                        />
                      ) : (
                        <div className="booking-addon__chips">
                          {group.choices.map((choice) => {
                            const active = (addons[group.key] ?? group.choices[0].value) === choice.value;
                            return (
                              <button
                                type="button"
                                key={choice.value}
                                className={`booking-addon__chip${active ? " is-active" : ""}`}
                                aria-pressed={active}
                                onClick={() => setAddons((current) => ({ ...current, [group.key]: choice.value }))}
                              >
                                {localizeBookingValue(language, choice.label)}
                                {choice.priceEUR ? (
                                  <span className="booking-addon__chip-price">
                                    +<PriceTag amountEUR={choice.priceEUR} />
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Only where there is a choice to make, and only on the mode
                  actually selected — a stepper stuck at 1 with both buttons
                  greyed out reads as broken, and four of them at once reads
                  as clutter. */}
              {selected.name === option.name && option.maxTeammates > 1 && (
                <div className="booking-option__teammates">
                  <span className="booking-option__teammates-label">
                    <i className="fa-solid fa-user-group" aria-hidden="true" /> {copy.teammates}
                  </span>
                  <span className="booking-stepper">
                    <button
                      type="button"
                      onClick={() => setGroupSize((n) => Math.max(1, n - 1))}
                      disabled={groupSize <= 1}
                      aria-label={copy.fewer}
                    >
                      <i className="fa-solid fa-minus" aria-hidden="true" />
                    </button>
                    <span className="booking-stepper__value">{groupSize}</span>
                    <button
                      type="button"
                      onClick={() => setGroupSize((n) => Math.min(option.maxTeammates, n + 1))}
                      disabled={groupSize >= option.maxTeammates}
                      aria-label={copy.more}
                    >
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Under the mode list rather than in a full-width section of its
            own further down. The left column used to simply stop here, leaving
            a third of a screen empty beside a sticky sidebar, and the answers
            were a scroll away from the question that prompts them. */}
        <section className="booking-faq" id="booking-faq">
          <Reveal>
            <div className="booking-faq__head">
              <h2 className="booking-faq__title">
                {copy.questions}{" "}{copy.categories[visibleCategory.category] ?? visibleCategory.category}
              </h2>
            </div>
          </Reveal>

          <Reveal delay={40}>
            <div className="faq" key={visibleCategory.category}>
              {faqItems.map((item, i) => (
                <div className={`faq-row${openFaq === i ? " is-open" : ""}`} key={item.q}>
                  <button
                    type="button"
                    className="faq-row__btn"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span>{localizeBookingValue(language, item.q)}</span>
                    <i className="fa-solid fa-plus faq-row__icon" aria-hidden="true" />
                  </button>
                  {openFaq === i && <div className="faq-row__panel faq-row__panel--anim">{localizeBookingValue(language, item.a)}</div>}
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </div>

      <div className="booking-sidebar-wrap">
        <aside className="booking-sidebar">
          <div className="booking-sidebar__body">
            <div className="booking-sidebar__summary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gameIcon(game.slug)} alt="" className="booking-sidebar__summary-icon" />
              <span className="booking-sidebar__summary-copy">
                <span className="booking-sidebar__summary-game">{game.name}</span>
                <span className="booking-sidebar__summary-option">{selected.name}</span>
                {/* The mode's name no longer says what was booked once the
                    add-ons decide half the price — a +18 with 4 traders is a
                    different order than a +2. */}
                {chosenAddons.length > 0 && (
                  <span className="booking-sidebar__summary-addons">
                    {chosenAddons.map(({ value }) => value).join(" · ")}
                    {runsBooked > 1 ? ` · ${runsBooked} ${localizeBookingValue(language, "runs")}` : ""}
                  </span>
                )}
              </span>
            </div>

            {/* Row always renders — even for a 1-on-1 mode — so the card is
                the same height regardless of which mode is selected. A
                1-on-1 mode just shows a plain "1" instead of a stepper stuck
                at 1 with both buttons disabled, which read as broken. */}
            <div className="booking-sidebar__row booking-sidebar__row--last">
              <span>{copy.teammates}</span>
              {selected.maxTeammates > 1 ? (
                <span className="booking-stepper">
                  <button
                    type="button"
                    onClick={() => setGroupSize((n) => Math.max(1, n - 1))}
                    disabled={groupSize <= 1}
                    aria-label={copy.fewer}
                  >
                    <i className="fa-solid fa-minus" aria-hidden="true" />
                  </button>
                  <span className="booking-stepper__value">{groupSize}</span>
                  <button
                    type="button"
                    onClick={() => setGroupSize((n) => Math.min(selected.maxTeammates, n + 1))}
                    disabled={groupSize >= selected.maxTeammates}
                    aria-label={copy.more}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <span className="booking-sidebar__row-fixed">1</span>
              )}
            </div>

            <TrustPoints compact payments={false} />
          </div>

          {/* Total + CTA stay pinned to the bottom of the card so the
              button is reachable however far the mode list has pushed the
              card down. */}
          <div className="booking-sidebar__foot">
            <div className={`booking-sidebar__total${pulsing ? " is-pulsing" : ""}`}>
              <span>{copy.total}</span>
              <PriceTag amountEUR={total} />
            </div>

            <button type="button" className="btn btn--vivid btn--block booking-sidebar__cta" onClick={() => setIngameOpen(true)}>
              <i className="fa-solid fa-bolt" aria-hidden="true" /> {copy.checkout}
            </button>

            <PaymentStrip />
          </div>
        </aside>
      </div>

      <Modal open={ingameOpen} onClose={() => setIngameOpen(false)} labelledBy="booking-ingame-title">
        <div className="ingame-modal">
          <CheckoutIngameStep
            headingId="booking-ingame-title"
            gameSlug={game.slug}
            gameName={game.name}
            canSave={status === "authenticated"}
            backLabel={copy.cancel}
            continueLabel={copy.checkout}
            onBack={() => setIngameOpen(false)}
            onContinue={(ingame) => {
              setPricingAccount({ gameSlug: game.slug, rank: ingame.rank });
              setIngameOpen(false);
              goToCheckout(ingame);
            }}
          />
        </div>
      </Modal>

      <Modal open={editAccountOpen} onClose={() => setEditAccountOpen(false)} labelledBy="booking-edit-account-title">
        <div className="ingame-modal">
          <CheckoutIngameStep
            headingId="booking-edit-account-title"
            gameSlug={game.slug}
            gameName={game.name}
            canSave
            backLabel={copy.close}
            continueLabel={copy.save}
            onBack={() => setEditAccountOpen(false)}
            onContinue={(ingame) => {
              setPricingAccount({ gameSlug: game.slug, rank: ingame.rank });
              setEditAccountOpen(false);
            }}
          />
        </div>
      </Modal>
    </div>

    </>
  );
}
