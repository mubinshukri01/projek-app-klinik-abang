import type { PayerType, VisitStatus } from "@/generated/prisma/enums";

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  REGISTERED: "Didaftar",
  WAITING: "Menunggu",
  IN_CONSULT: "Dalam rawatan",
  DISPENSING: "Dispensari",
  PAYMENT: "Menunggu bayaran",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const VISIT_STATUS_TONE: Record<
  VisitStatus,
  "neutral" | "brand" | "ok" | "warn" | "danger" | "info"
> = {
  REGISTERED: "neutral",
  WAITING: "warn",
  IN_CONSULT: "brand",
  DISPENSING: "info",
  PAYMENT: "info",
  COMPLETED: "ok",
  CANCELLED: "danger",
};

/** Susunan aliran pesakit melalui klinik, digunakan untuk mengisih papan giliran. */
export const VISIT_STATUS_ORDER: VisitStatus[] = [
  "WAITING",
  "IN_CONSULT",
  "DISPENSING",
  "PAYMENT",
  "REGISTERED",
  "COMPLETED",
  "CANCELLED",
];

export const PAYER_LABEL: Record<PayerType, string> = {
  SELF: "Sendiri",
  PANEL: "Panel",
  MADANI: "Skim MADANI",
  PEKA_B40: "PeKa B40",
};
