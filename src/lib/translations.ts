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
} as const;

export type TranslationKey = keyof typeof en;
type Dictionary = Partial<Record<TranslationKey, string>>;

const de: Dictionary = {
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
