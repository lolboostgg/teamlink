import type { LanguageCode } from "@/lib/i18n";

export interface BookingCopy {
  account: string; accountHint: string; book: string; choose: string; teammates: string;
  fewer: string; more: string; questions: string; total: string; checkout: string;
  cancel: string; close: string; save: string; secure: string; guarantee: string; support: string;
  categories: Record<string, string>;
}

const copy: Record<LanguageCode, BookingCopy> = {
  en: { account:"Your in-game account", accountHint:"IGN, region and role — change it before you book", book:"Book a session", choose:"Choose your mode", teammates:"Teammates", fewer:"Fewer teammates", more:"More teammates", questions:"Questions about", total:"Total", checkout:"Continue to checkout", cancel:"Cancel", close:"Close", save:"Save account", secure:"Secure & encrypted", guarantee:"Money-back guarantee", support:"24/7 human support", categories:{"Team Up":"Team Up",Ranked:"Ranked",Social:"Social",Coaching:"Coaching",Bundles:"Bundles"} },
  de: { account:"Dein In-Game-Konto", accountHint:"IGN, Region und Rolle – ändere sie vor der Buchung", book:"Session buchen", choose:"Wähle deinen Modus", teammates:"Mitspieler", fewer:"Weniger Mitspieler", more:"Mehr Mitspieler", questions:"Fragen zu", total:"Gesamt", checkout:"Weiter zur Kasse", cancel:"Abbrechen", close:"Schließen", save:"Konto speichern", secure:"Sicher & verschlüsselt", guarantee:"Geld-zurück-Garantie", support:"Persönlicher Support rund um die Uhr", categories:{"Team Up":"Zusammenspielen",Ranked:"Rangliste",Social:"Entspannt",Coaching:"Coaching",Bundles:"Pakete"} },
  fr: { account:"Ton compte en jeu", accountHint:"Pseudo, région et rôle — modifie-les avant de réserver", book:"Réserver une session", choose:"Choisis ton mode", teammates:"Coéquipiers", fewer:"Moins de coéquipiers", more:"Plus de coéquipiers", questions:"Questions sur", total:"Total", checkout:"Continuer vers le paiement", cancel:"Annuler", close:"Fermer", save:"Enregistrer le compte", secure:"Sécurisé et chiffré", guarantee:"Garantie satisfait ou remboursé", support:"Assistance humaine 24 h/24", categories:{"Team Up":"Équipe",Ranked:"Classé",Social:"Détente",Coaching:"Coaching",Bundles:"Packs"} },
  es: { account:"Tu cuenta del juego", accountHint:"Nombre, región y rol — cámbialos antes de reservar", book:"Reservar una sesión", choose:"Elige tu modo", teammates:"Compañeros", fewer:"Menos compañeros", more:"Más compañeros", questions:"Preguntas sobre", total:"Total", checkout:"Continuar al pago", cancel:"Cancelar", close:"Cerrar", save:"Guardar cuenta", secure:"Seguro y cifrado", guarantee:"Garantía de devolución", support:"Soporte humano 24/7", categories:{"Team Up":"En equipo",Ranked:"Competitivo",Social:"Social",Coaching:"Coaching",Bundles:"Paquetes"} },
  pl: { account:"Twoje konto w grze", accountHint:"Nazwa, region i rola — zmień je przed rezerwacją", book:"Zarezerwuj sesję", choose:"Wybierz tryb", teammates:"Gracze", fewer:"Mniej graczy", more:"Więcej graczy", questions:"Pytania o", total:"Razem", checkout:"Przejdź do płatności", cancel:"Anuluj", close:"Zamknij", save:"Zapisz konto", secure:"Bezpiecznie i szyfrowane", guarantee:"Gwarancja zwrotu pieniędzy", support:"Pomoc człowieka 24/7", categories:{"Team Up":"Wspólna gra",Ranked:"Rankingowa",Social:"Towarzyska",Coaching:"Coaching",Bundles:"Pakiety"} },
  tr: { account:"Oyun içi hesabın", accountHint:"Oyun adı, bölge ve rol — rezervasyondan önce değiştir", book:"Oturum ayırt", choose:"Modunu seç", teammates:"Takım arkadaşları", fewer:"Daha az takım arkadaşı", more:"Daha fazla takım arkadaşı", questions:"Şununla ilgili sorular", total:"Toplam", checkout:"Ödemeye devam et", cancel:"İptal", close:"Kapat", save:"Hesabı kaydet", secure:"Güvenli ve şifreli", guarantee:"Para iade garantisi", support:"7/24 gerçek insan desteği", categories:{"Team Up":"Takım ol",Ranked:"Dereceli",Social:"Sosyal",Coaching:"Koçluk",Bundles:"Paketler"} },
};

const germanDescriptions: Record<string, string> = {
  "Play with a Master+ teammate":"Spiele mit einem Mitspieler ab Master",
  "Play with a Grandmaster+ teammate":"Spiele mit einem Mitspieler ab Grandmaster",
  "Bring your friends and play with multiple Master+ teammates":"Bring deine Freunde mit und spielt mit mehreren Mitspielern ab Master",
  "Play with a Diamond 4+ teammate":"Spiele mit einem Mitspieler ab Diamant 4",
  "What rank will my teammate be?":"Welchen Rang hat mein Mitspieler?",
  "Diamond+ for Duo, Grandmaster+ for Duo Pro — you'll see their exact rank before the session starts.":"Bei Duo mindestens Diamant, bei Duo Pro mindestens Grandmaster – den genauen Rang siehst du vor Beginn der Session.",
  "How does matching work?":"Wie funktioniert das Matching?",
  "Pick a game and a session type and we'll match you with an available teammate that fits, usually in under two minutes.":"Wähle ein Spiel und eine Session-Art. Wir finden normalerweise in unter zwei Minuten einen passenden verfügbaren Mitspieler für dich.",
  "Is it safe to play with a QUP.gg teammate?":"Ist das Spielen mit einem QUP.gg-Mitspieler sicher?",
  "Yes. You never share your account or password. Teammates join your lobby the same way any friend would.":"Ja. Du teilst weder dein Konto noch dein Passwort. Dein Mitspieler tritt deiner Lobby genauso wie ein Freund bei.",
  "If I don't like my teammate, can I switch?":"Kann ich meinen Mitspieler wechseln?",
  "Yes, you can request a different teammate at any time before or during your session.":"Ja, du kannst vor oder während deiner Session jederzeit einen anderen Mitspieler anfordern.",
  "What is your cancellation policy?":"Wie kann ich stornieren?",
  "You can cancel before a teammate is matched for a full refund. See our terms for details once a session has started.":"Vor dem Match mit einem Mitspieler kannst du kostenlos stornieren. Nach Beginn der Session gelten die Bedingungen.",
};

export function getBookingCopy(language: LanguageCode) { return copy[language]; }
export function localizeBookingValue(language: LanguageCode, value: string) {
  if (language === "de" && germanDescriptions[value]) return germanDescriptions[value];
  const replacements: Partial<Record<LanguageCode, [string, string][]>> = {
    de: [["min away", "Min. entfernt"], ["<1 Min. entfernt", "<1 Min. entfernt"], ["/game", "/Spiel"], ["/hour", "/Stunde"], ["/hours", "/Stunden"]],
    fr: [["min away", "min d’attente"], ["/game", "/partie"], ["/hour", "/heure"], ["/hours", "/heures"]],
    es: [["min away", "min de espera"], ["/game", "/partida"], ["/hour", "/hora"], ["/hours", "/horas"]],
    pl: [["min away", "min oczekiwania"], ["/game", "/gra"], ["/hour", "/godzina"], ["/hours", "/godziny"]],
    tr: [["min away", "dk bekleme"], ["/game", "/oyun"], ["/hour", "/saat"], ["/hours", "/saat"]],
  };
  return (replacements[language] ?? []).reduce((text, [from, to]) => text.replace(from, to), value);
}
