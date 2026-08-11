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
  "Play a normal game with a Master+ teammate":"Spiele ein normales Match mit einem Mitspieler ab Master",
  "Play League Classic with a Master+ teammate":"Spiele League Classic mit einem Mitspieler ab Master",
  "Hangout and meet with our best girl teammates":"Spiel entspannt mit einer unserer besten Mitspielerinnen",
  "Play a for fun ARAM with our best teammates":"Spiele ein entspanntes ARAM mit unseren besten Mitspielern",
  "Get coached and play a practice game at 50% off":"Lass dich coachen und spiele ein Trainingsmatch zum halben Preis",
  "Get coached and play a practice game at 100% off":"Lass dich coachen und spiele ein kostenloses Trainingsmatch",
  "Get coached and play 45 min at 50% off":"Lass dich coachen und spiele 45 Minuten zum halben Preis",
  "Get coached by a Grandmaster+ teammate":"Lass dich von einem Mitspieler ab Grandmaster coachen",
  "Get coached by a Grandmaster+ player":"Lass dich von einem Spieler ab Grandmaster coachen",
  "Get coached by a Radiant teammate":"Lass dich von einem Radiant-Mitspieler coachen",
  "Get coached by a top tier teammate":"Lass dich von einem Mitspieler auf Top-Niveau coachen",
  "Get coached by our top teammates":"Lass dich von einem unserer besten Mitspieler coachen",
  "Get coached by a verified pro":"Lass dich von einem verifizierten Profi coachen",
  "Get coached by an Ultimate Champion teammate":"Lass dich von einem Ultimate-Champion-Mitspieler coachen",
  "Get coached by a top 0.1% Unreal & high PR teammate":"Lass dich von einem Unreal-Mitspieler aus den Top 0,1 % coachen",
  "Get coached by a top 0.1% Apex Predator teammate":"Lass dich von einem Apex-Predator-Mitspieler aus den Top 0,1 % coachen",
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
    de: [["<1 min away", "<1 Min."], ["min away", "Min. Wartezeit"], ["/45 min + game", "/45 Min. + Spiel"], ["/45min", "/45 Min."], ["/45 min", "/45 Min."], ["/30 min", "/30 Min."], ["/90 min", "/90 Min."], ["/game", "/Spiel"], ["/hour", "/Stunde"], ["/hours", "/Stunden"]],
    fr: [["min away", "min d’attente"], ["/game", "/partie"], ["/hour", "/heure"], ["/hours", "/heures"]],
    es: [["min away", "min de espera"], ["/game", "/partida"], ["/hour", "/hora"], ["/hours", "/horas"]],
    pl: [["min away", "min oczekiwania"], ["/game", "/gra"], ["/hour", "/godzina"], ["/hours", "/godziny"]],
    tr: [["min away", "dk bekleme"], ["/game", "/oyun"], ["/hour", "/saat"], ["/hours", "/saat"]],
  };
  return (replacements[language] ?? []).reduce((text, [from, to]) => text.replace(from, to), value);
}
