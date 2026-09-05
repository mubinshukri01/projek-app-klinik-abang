/**
 * Peraturan kawalan akses.
 *
 * Modul tulen tanpa import pelayar-terlarang, supaya navigasi sisi klien
 * boleh menapis pautan menggunakan peraturan yang SAMA seperti yang
 * dikuatkuasakan oleh pelayan. Penguatkuasaan sebenar tetap di pelayan —
 * menyembunyikan pautan bukan keselamatan.
 */

import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Pentadbir",
  DOCTOR: "Doktor",
  NURSE: "Jururawat",
  FRONTDESK: "Kaunter Depan",
  PHARMACY: "Farmasi",
};

/**
 * ADMIN sengaja TIDAK diberi kelulusan menyeluruh: hanya doktor dan jururawat
 * boleh membuka skrin klinikal, dan hanya doktor berdaftar MMC yang boleh
 * menandatangani rekod (dikuatkuasakan pada tindakan, bukan hanya laluan).
 */
export const AREA_ROLES = {
  pendaftaran: ["FRONTDESK", "ADMIN"],
  konsultasi: ["DOCTOR", "NURSE"],
  dispensari: ["PHARMACY", "ADMIN"],
  bil: ["FRONTDESK", "ADMIN"],
  inventori: ["PHARMACY", "ADMIN"],
  panel: ["ADMIN"],
  laporan: ["ADMIN", "DOCTOR"],
  tetapan: ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Area = keyof typeof AREA_ROLES;

export const AREA_LABEL: Record<Area, string> = {
  pendaftaran: "Pendaftaran",
  konsultasi: "Konsultasi",
  dispensari: "Dispensari",
  bil: "Bil & Bayaran",
  inventori: "Inventori",
  panel: "Panel & Tuntutan",
  laporan: "Laporan",
  tetapan: "Tetapan",
};

export function canAccess(role: Role, area: Area): boolean {
  return (AREA_ROLES[area] as readonly Role[]).includes(role);
}

export interface NavItem {
  href: string;
  label: string;
  /** null bermaksud terbuka kepada semua kakitangan yang telah log masuk. */
  area: Area | null;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Utama", area: null },
  { href: "/pendaftaran", label: "Pendaftaran", area: "pendaftaran" },
  { href: "/queue", label: "Giliran", area: null },
  { href: "/konsultasi", label: "Konsultasi", area: "konsultasi" },
  { href: "/dispensari", label: "Dispensari", area: "dispensari" },
  { href: "/bil", label: "Bil", area: "bil" },
  { href: "/inventori", label: "Inventori", area: "inventori" },
  { href: "/panel", label: "Panel", area: "panel" },
  { href: "/laporan", label: "Laporan", area: "laporan" },
  { href: "/tetapan", label: "Tetapan", area: "tetapan" },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => item.area === null || canAccess(role, item.area));
}
