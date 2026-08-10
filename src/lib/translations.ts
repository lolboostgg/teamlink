import type { LanguageCode } from "@/lib/i18n";

const en = {
  "common.login": "Login", "common.language": "Language", "common.currency": "Currency",
  "nav.overview": "Overview", "nav.analytics": "Analytics", "nav.users": "Users", "nav.teammates": "Teammates",
  "nav.dispatch": "Live dispatch", "nav.ordersSessions": "Orders & sessions", "nav.orders": "Orders", "nav.chats": "Chats",
  "nav.payouts": "Payouts & disputes", "nav.transactions": "Transactions", "nav.applications": "Applications",
  "nav.onboarding": "Onboarding", "nav.audit": "Activity log", "nav.disputes": "Disputes", "nav.sanctions": "Sanctions",
  "nav.operations": "Operations", "nav.exports": "Exports & reports", "nav.roles": "Roles & permissions", "nav.security": "Security",
  "nav.favorites": "Favorites", "nav.wallet": "Wallet", "nav.support": "Support", "nav.settings": "Settings",
  "nav.earnings": "Earnings", "nav.gameProfiles": "Game profiles", "nav.availability": "Availability",
  "nav.profile": "Profile", "nav.dashboard": "Dashboard", "nav.logout": "Log out", "nav.quickAccess": "Quick access",
  "role.client": "Client", "role.teammate": "Teammate", "role.admin": "Admin", "role.support": "Support",
  "role.operations": "Operations", "role.finance": "Finance", "role.superadmin": "Superadmin",
  "home.matched":"Matched in under 2 minutes", "home.tagline":"Ready. Queue. Play.", "home.intro":"Pick a game, pick a mode, and get matched in under two minutes. No downloads, no waiting rooms.", "home.playNow":"Play now", "home.how":"How it works", "home.scrollBooking":"Scroll to booking",
  "how.title":"Play with a teammate in under 2 minutes.", "how.step1.title":"Create your account", "how.step1.text":"Sign up with Discord or email and add your in-game name. Takes about 30 seconds.", "how.step2.title":"Pick your game and mode", "how.step2.text":"Choose your game and the vibe you want: ranked, casual, or coaching.", "how.step3.title":"Get matched fast", "how.step3.text":"Most players are matched in under 2 minutes, so you can play right away.",
  "cta.title":"Ready to find your teammate?", "cta.text":"Get matched in under two minutes, with no commitment. Cancel anytime.", "cta.games":"Browse games", "cta.account":"Create free account",
} as const;

export type TranslationKey = keyof typeof en;
type Dictionary = Partial<Record<TranslationKey, string>>;

const de: Dictionary = {
  "home.matched":"In unter 2 Minuten gematcht", "home.tagline":"Bereit. Einreihen. Spielen.", "home.intro":"Such dir ein Spiel und einen Modus aus und finde in unter zwei Minuten deinen Mitspieler. Keine Downloads, keine Warteräume.", "home.playNow":"Jetzt spielen", "home.how":"So funktioniert’s", "home.scrollBooking":"Zur Buchung scrollen", "how.title":"Spiele in unter 2 Minuten mit einem Mitspieler.", "how.step1.title":"Erstelle dein Konto", "how.step1.text":"Registriere dich mit Discord oder E-Mail und füge deinen In-Game-Namen hinzu. Dauert etwa 30 Sekunden.", "how.step2.title":"Wähle Spiel und Modus", "how.step2.text":"Wähle dein Spiel und worauf du Lust hast: Ranked, entspannt spielen oder Coaching.", "how.step3.title":"Schnell gematcht", "how.step3.text":"Die meisten Spieler werden in unter 2 Minuten gematcht, damit du direkt loslegen kannst.", "cta.title":"Bereit, deinen Mitspieler zu finden?", "cta.text":"Lass dich in unter zwei Minuten matchen – ohne Verpflichtung. Du kannst jederzeit abbrechen.", "cta.games":"Spiele ansehen", "cta.account":"Kostenloses Konto erstellen",
  "common.login":"Anmelden", "common.language":"Sprache", "common.currency":"Währung", "nav.overview":"Übersicht",
  "nav.analytics":"Analysen", "nav.users":"Nutzer", "nav.teammates":"Mitspieler", "nav.dispatch":"Live-Zuweisung",
  "nav.ordersSessions":"Bestellungen & Sessions", "nav.orders":"Bestellungen", "nav.chats":"Chats", "nav.payouts":"Auszahlungen & Streitfälle",
  "nav.transactions":"Transaktionen", "nav.applications":"Bewerbungen", "nav.onboarding":"Onboarding", "nav.audit":"Aktivitätsprotokoll",
  "nav.disputes":"Streitfälle", "nav.sanctions":"Sanktionen", "nav.operations":"Betrieb", "nav.exports":"Exporte & Berichte",
  "nav.roles":"Rollen & Berechtigungen", "nav.security":"Sicherheit", "nav.favorites":"Favoriten", "nav.wallet":"Guthaben",
  "nav.support":"Support", "nav.settings":"Einstellungen", "nav.earnings":"Einnahmen", "nav.gameProfiles":"Spielprofile",
  "nav.availability":"Verfügbarkeit", "nav.profile":"Profil", "nav.dashboard":"Dashboard", "nav.logout":"Abmelden",
  "nav.quickAccess":"Schnellzugriff", "role.client":"Kunde", "role.teammate":"Mitspieler", "role.finance":"Finanzen", "role.operations":"Betrieb",
};

const fr: Dictionary = {
  "home.matched":"Match en moins de 2 minutes", "home.tagline":"Prêt. En file. Joue.", "home.intro":"Choisis un jeu et un mode, puis trouve un coéquipier en moins de deux minutes. Aucun téléchargement, aucune salle d’attente.", "home.playNow":"Jouer maintenant", "home.how":"Comment ça marche", "home.scrollBooking":"Aller à la réservation", "how.title":"Joue avec un coéquipier en moins de 2 minutes.", "how.step1.title":"Crée ton compte", "how.step1.text":"Inscris-toi avec Discord ou ton e-mail et ajoute ton pseudo en jeu. Environ 30 secondes.", "how.step2.title":"Choisis ton jeu et ton mode", "how.step2.text":"Choisis ton jeu et ton ambiance : classé, détente ou coaching.", "how.step3.title":"Trouve vite un partenaire", "how.step3.text":"La plupart des joueurs trouvent un partenaire en moins de 2 minutes.", "cta.title":"Prêt à trouver ton coéquipier ?", "cta.text":"Trouve un partenaire en moins de deux minutes, sans engagement. Annule quand tu veux.", "cta.games":"Voir les jeux", "cta.account":"Créer un compte gratuit",
  "common.login":"Connexion", "common.language":"Langue", "common.currency":"Devise", "nav.overview":"Aperçu", "nav.analytics":"Analyses",
  "nav.users":"Utilisateurs", "nav.teammates":"Coéquipiers", "nav.dispatch":"Répartition en direct", "nav.ordersSessions":"Commandes et sessions",
  "nav.orders":"Commandes", "nav.chats":"Chats", "nav.payouts":"Paiements et litiges", "nav.transactions":"Transactions",
  "nav.applications":"Candidatures", "nav.audit":"Journal d’activité", "nav.disputes":"Litiges", "nav.sanctions":"Sanctions",
  "nav.operations":"Opérations", "nav.exports":"Exports et rapports", "nav.roles":"Rôles et autorisations", "nav.security":"Sécurité",
  "nav.favorites":"Favoris", "nav.wallet":"Portefeuille", "nav.support":"Assistance", "nav.settings":"Paramètres", "nav.earnings":"Revenus",
  "nav.gameProfiles":"Profils de jeu", "nav.availability":"Disponibilité", "nav.profile":"Profil", "nav.dashboard":"Tableau de bord",
  "nav.logout":"Déconnexion", "nav.quickAccess":"Accès rapide", "role.teammate":"Coéquipier", "role.support":"Assistance", "role.operations":"Opérations", "role.finance":"Finance",
};

const es: Dictionary = {
  "home.matched":"Partida en menos de 2 minutos", "home.tagline":"Listo. En cola. Juega.", "home.intro":"Elige un juego y un modo y encuentra compañero en menos de dos minutos. Sin descargas ni salas de espera.", "home.playNow":"Jugar ahora", "home.how":"Cómo funciona", "home.scrollBooking":"Ir a la reserva", "how.title":"Juega con un compañero en menos de 2 minutos.", "how.step1.title":"Crea tu cuenta", "how.step1.text":"Regístrate con Discord o correo y añade tu nombre del juego. Tardarás unos 30 segundos.", "how.step2.title":"Elige juego y modo", "how.step2.text":"Elige tu juego y el plan: competitivo, casual o coaching.", "how.step3.title":"Encuentra compañero rápido", "how.step3.text":"La mayoría encuentra compañero en menos de 2 minutos.", "cta.title":"¿Listo para encontrar compañero?", "cta.text":"Encuentra compañero en menos de dos minutos, sin compromiso. Cancela cuando quieras.", "cta.games":"Ver juegos", "cta.account":"Crear cuenta gratis",
  "common.login":"Iniciar sesión", "common.language":"Idioma", "common.currency":"Moneda", "nav.overview":"Resumen", "nav.analytics":"Analíticas",
  "nav.users":"Usuarios", "nav.teammates":"Compañeros", "nav.dispatch":"Asignación en vivo", "nav.ordersSessions":"Pedidos y sesiones",
  "nav.orders":"Pedidos", "nav.chats":"Chats", "nav.payouts":"Pagos y disputas", "nav.transactions":"Transacciones",
  "nav.applications":"Solicitudes", "nav.audit":"Registro de actividad", "nav.disputes":"Disputas", "nav.sanctions":"Sanciones",
  "nav.operations":"Operaciones", "nav.exports":"Exportaciones e informes", "nav.roles":"Roles y permisos", "nav.security":"Seguridad",
  "nav.favorites":"Favoritos", "nav.wallet":"Cartera", "nav.support":"Soporte", "nav.settings":"Ajustes", "nav.earnings":"Ganancias",
  "nav.gameProfiles":"Perfiles de juego", "nav.availability":"Disponibilidad", "nav.profile":"Perfil", "nav.dashboard":"Panel",
  "nav.logout":"Cerrar sesión", "nav.quickAccess":"Acceso rápido", "role.client":"Cliente", "role.teammate":"Compañero", "role.operations":"Operaciones", "role.finance":"Finanzas",
};

const pl: Dictionary = {
  "home.matched":"Dopasowanie w mniej niż 2 minuty", "home.tagline":"Gotowi. Kolejka. Gra.", "home.intro":"Wybierz grę i tryb, a znajdziemy gracza w mniej niż dwie minuty. Bez pobierania i poczekalni.", "home.playNow":"Graj teraz", "home.how":"Jak to działa", "home.scrollBooking":"Przejdź do rezerwacji", "how.title":"Zagraj z graczem w mniej niż 2 minuty.", "how.step1.title":"Utwórz konto", "how.step1.text":"Zarejestruj się przez Discord lub e-mail i dodaj nazwę z gry. To około 30 sekund.", "how.step2.title":"Wybierz grę i tryb", "how.step2.text":"Wybierz grę i styl: rankingowy, swobodny lub coaching.", "how.step3.title":"Szybkie dopasowanie", "how.step3.text":"Większość graczy znajduje partnera w mniej niż 2 minuty.", "cta.title":"Gotowy znaleźć gracza?", "cta.text":"Znajdź gracza w mniej niż dwie minuty, bez zobowiązań. Anuluj w każdej chwili.", "cta.games":"Przeglądaj gry", "cta.account":"Utwórz darmowe konto",
  "common.login":"Zaloguj się", "common.language":"Język", "common.currency":"Waluta", "nav.overview":"Przegląd", "nav.analytics":"Analityka",
  "nav.users":"Użytkownicy", "nav.teammates":"Gracze", "nav.dispatch":"Przydział na żywo", "nav.ordersSessions":"Zamówienia i sesje",
  "nav.orders":"Zamówienia", "nav.chats":"Czaty", "nav.payouts":"Wypłaty i spory", "nav.transactions":"Transakcje",
  "nav.applications":"Zgłoszenia", "nav.audit":"Dziennik aktywności", "nav.disputes":"Spory", "nav.sanctions":"Sankcje",
  "nav.operations":"Operacje", "nav.exports":"Eksporty i raporty", "nav.roles":"Role i uprawnienia", "nav.security":"Bezpieczeństwo",
  "nav.favorites":"Ulubione", "nav.wallet":"Portfel", "nav.support":"Wsparcie", "nav.settings":"Ustawienia", "nav.earnings":"Zarobki",
  "nav.gameProfiles":"Profile gier", "nav.availability":"Dostępność", "nav.profile":"Profil", "nav.dashboard":"Panel",
  "nav.logout":"Wyloguj się", "nav.quickAccess":"Szybki dostęp", "role.client":"Klient", "role.teammate":"Gracz", "role.support":"Wsparcie", "role.operations":"Operacje", "role.finance":"Finanse",
};

const tr: Dictionary = {
  "home.matched":"2 dakikadan kısa sürede eşleş", "home.tagline":"Hazır. Sıraya gir. Oyna.", "home.intro":"Oyunu ve modu seç, iki dakikadan kısa sürede takım arkadaşını bul. İndirme ve bekleme odası yok.", "home.playNow":"Şimdi oyna", "home.how":"Nasıl çalışır", "home.scrollBooking":"Rezervasyona git", "how.title":"2 dakikadan kısa sürede bir takım arkadaşıyla oyna.", "how.step1.title":"Hesabını oluştur", "how.step1.text":"Discord veya e-posta ile kaydol ve oyun içi adını ekle. Yaklaşık 30 saniye sürer.", "how.step2.title":"Oyununu ve modunu seç", "how.step2.text":"Oyununu ve istediğin tarzı seç: dereceli, rahat veya koçluk.", "how.step3.title":"Hızlıca eşleş", "how.step3.text":"Çoğu oyuncu 2 dakikadan kısa sürede eşleşir.", "cta.title":"Takım arkadaşını bulmaya hazır mısın?", "cta.text":"İki dakikadan kısa sürede eşleş, taahhüt yok. İstediğin zaman iptal et.", "cta.games":"Oyunlara göz at", "cta.account":"Ücretsiz hesap oluştur",
  "common.login":"Giriş yap", "common.language":"Dil", "common.currency":"Para birimi", "nav.overview":"Genel bakış", "nav.analytics":"Analizler",
  "nav.users":"Kullanıcılar", "nav.teammates":"Takım arkadaşları", "nav.dispatch":"Canlı yönlendirme", "nav.ordersSessions":"Siparişler ve oturumlar",
  "nav.orders":"Siparişler", "nav.chats":"Sohbetler", "nav.payouts":"Ödemeler ve anlaşmazlıklar", "nav.transactions":"İşlemler",
  "nav.applications":"Başvurular", "nav.audit":"Etkinlik günlüğü", "nav.disputes":"Anlaşmazlıklar", "nav.sanctions":"Yaptırımlar",
  "nav.operations":"Operasyonlar", "nav.exports":"Dışa aktarımlar ve raporlar", "nav.roles":"Roller ve izinler", "nav.security":"Güvenlik",
  "nav.favorites":"Favoriler", "nav.wallet":"Cüzdan", "nav.support":"Destek", "nav.settings":"Ayarlar", "nav.earnings":"Kazançlar",
  "nav.gameProfiles":"Oyun profilleri", "nav.availability":"Uygunluk", "nav.profile":"Profil", "nav.dashboard":"Panel",
  "nav.logout":"Çıkış yap", "nav.quickAccess":"Hızlı erişim", "role.client":"Müşteri", "role.teammate":"Takım arkadaşı", "role.support":"Destek", "role.operations":"Operasyonlar", "role.finance":"Finans", "role.superadmin":"Süper admin",
};

const dictionaries: Record<LanguageCode, Dictionary> = { en, de, fr, es, pl, tr };

export function translate(language: LanguageCode, key: TranslationKey): string {
  return dictionaries[language][key] ?? en[key];
}
