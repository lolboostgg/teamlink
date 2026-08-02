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
