export interface BookingRequestNotification {
  id: string;
  type: "booking-request";
  status: "pending" | "accepted" | "declined";
  clientName: string;
  gameName: string;
  option: string;
  priceEUR: number;
  createdAt: number;
}

const CLIENT_NAMES = ["Mara Feld", "Owen Brooks", "Yuki Tanaka", "Deniz Aksoy", "Sofia Reyes", "Liam Fischer"];
const TEMPLATES: { gameName: string; option: string; priceEUR: number }[] = [
  { gameName: "League of Legends", option: "Duo Pro", priceEUR: 7.5 },
  { gameName: "Valorant", option: "Ranked 5s", priceEUR: 6.99 },
  { gameName: "Teamfight Tactics", option: "Duo Normal", priceEUR: 5.99 },
  { gameName: "Apex Legends", option: "Duo", priceEUR: 4.99 },
  { gameName: "Fortnite", option: "Hangout", priceEUR: 6.49 },
];

// A believable-looking incoming booking request — no backend to actually
// receive one from, so this is what the simulated realtime feed generates.
export function randomBookingRequest(): BookingRequestNotification {
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const clientName = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)];
  return {
    id: `bn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    type: "booking-request",
    status: "pending",
    clientName,
    ...template,
    createdAt: Date.now(),
  };
}
