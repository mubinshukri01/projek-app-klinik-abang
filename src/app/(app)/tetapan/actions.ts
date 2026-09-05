"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { hashPassword, requireArea } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export interface FormState {
  error: string | null;
  ok?: boolean;
  message?: string;
}

function str(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ─────────────────────────── profil klinik ───────────────────────────

const clinicSchema = z.object({
  name: z.string().trim().min(2, "Masukkan nama klinik."),
  registrationNo: z.string().trim().optional(),
  addressLine1: z.string().trim().min(2, "Masukkan alamat."),
  addressLine2: z.string().trim().optional(),
  postcode: z.string().trim().min(4, "Masukkan poskod."),
  city: z.string().trim().min(2, "Masukkan bandar."),
  state: z.string().trim().min(2, "Masukkan negeri."),
  phone: z.string().trim().min(6, "Masukkan nombor telefon."),
  email: z.string().trim().optional(),
  tin: z.string().trim().optional(),
});

export async function saveClinic(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("tetapan");

  const parsed = clinicSchema.safeParse({
    name: formData.get("name"),
    registrationNo: formData.get("registrationNo") ?? undefined,
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") ?? undefined,
    postcode: formData.get("postcode"),
    city: formData.get("city"),
    state: formData.get("state"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? undefined,
    tin: formData.get("tin") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Maklumat tidak lengkap." };
  }
  const input = parsed.data;

  const existing = await prisma.clinic.findFirst({ select: { id: true, name: true } });
  const data = {
    name: input.name,
    registrationNo: input.registrationNo || null,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 || null,
    postcode: input.postcode,
    city: input.city,
    state: input.state,
    phone: input.phone,
    email: input.email || null,
    tin: input.tin || null,
  };

  if (existing) {
    await prisma.clinic.update({ where: { id: existing.id }, data });
  } else {
    await prisma.clinic.create({ data: { id: "klinik-utama", ...data } });
  }

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Clinic",
    entityId: existing?.id ?? "klinik-utama",
    before: existing ? { name: existing.name } : undefined,
    after: data,
  });

  // Nama klinik muncul dalam pengepala setiap halaman dan pada setiap cetakan.
  revalidatePath("/", "layout");
  return { error: null, ok: true, message: "Profil klinik disimpan." };
}

// ─────────────────────────── pengguna ───────────────────────────

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Nama pengguna sekurang-kurangnya 3 aksara.")
    .regex(/^[a-z0-9._-]+$/, "Nama pengguna hanya boleh huruf kecil, nombor, titik, garis."),
  name: z.string().trim().min(2, "Masukkan nama penuh."),
  role: z.enum(["ADMIN", "DOCTOR", "NURSE", "FRONTDESK", "PHARMACY"]),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Kata laluan sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.`),
});

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireArea("tetapan");

  const parsed = userSchema.safeParse({
    username: String(formData.get("username") ?? "").toLowerCase(),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Maklumat tidak lengkap." };
  }
  const input = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { username: input.username },
    select: { id: true },
  });
  if (existing) return { error: `Nama pengguna "${input.username}" sudah digunakan.` };

  const mmcNumber = str(formData.get("mmcNumber"));
  // Doktor menandatangani rekod klinikal dan MC; nombor MMC disemak oleh
  // majikan dan syarikat insurans.
  if (input.role === "DOCTOR" && !mmcNumber) {
    return { error: "Doktor mesti mempunyai nombor pendaftaran MMC." };
  }

  const created = await prisma.user.create({
    data: {
      username: input.username,
      name: input.name,
      role: input.role,
      mmcNumber,
      phone: str(formData.get("phone")),
      passwordHash: await hashPassword(input.password),
    },
    select: { id: true },
  });

  await logAudit({
    actorId: admin.id,
    action: "CREATE",
    entity: "User",
    entityId: created.id,
    after: { username: input.username, name: input.name, role: input.role },
  });

  revalidatePath("/tetapan/pengguna");
  return { error: null, ok: true, message: `Pengguna ${input.username} dicipta.` };
}

export async function updateUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireArea("tetapan");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const name = str(formData.get("name"));
  const active = formData.get("active") === "on";
  const mmcNumber = str(formData.get("mmcNumber"));

  if (!userId) return { error: "Pengguna tidak dinyatakan." };
  if (!name) return { error: "Masukkan nama penuh." };
  if (!["ADMIN", "DOCTOR", "NURSE", "FRONTDESK", "PHARMACY"].includes(role)) {
    return { error: "Peranan tidak sah." };
  }
  if (role === "DOCTOR" && !mmcNumber) {
    return { error: "Doktor mesti mempunyai nombor pendaftaran MMC." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, active: true },
  });
  if (!target) return { error: "Pengguna tidak dijumpai." };

  // Seorang pentadbir tidak boleh mengunci dirinya sendiri keluar daripada
  // sistem — itu memerlukan campur tangan pangkalan data untuk dipulihkan.
  if (target.id === admin.id && (!active || role !== "ADMIN")) {
    return { error: "Anda tidak boleh menyahaktifkan atau menurunkan peranan akaun anda sendiri." };
  }

  if (target.role === "ADMIN" && (role !== "ADMIN" || !active)) {
    const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (admins <= 1) {
      return { error: "Sekurang-kurangnya seorang pentadbir aktif mesti kekal." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, role: role as "ADMIN", mmcNumber, active, phone: str(formData.get("phone")) },
  });

  // Menyahaktifkan akaun mesti menghalang akses serta-merta, bukan menunggu
  // sesi tamat 12 jam kemudian.
  if (!active) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await logAudit({
    actorId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    before: { role: target.role, active: target.active },
    after: { role, active, name },
  });

  revalidatePath("/tetapan/pengguna");
  return { error: null, ok: true, message: `Pengguna ${target.username} dikemas kini.` };
}

/**
 * Pentadbir menetapkan semula kata laluan pengguna lain.
 *
 * Semua sesi pengguna itu dibatalkan: jika kata laluan ditetapkan semula kerana
 * disyaki terdedah, sesi yang masih terbuka mesti mati bersamanya.
 */
export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireArea("tetapan");

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId) return { error: "Pengguna tidak dinyatakan." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Kata laluan sekurang-kurangnya ${MIN_PASSWORD_LENGTH} aksara.` };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!target) return { error: "Pengguna tidak dijumpai." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password) },
    });
    await tx.session.deleteMany({ where: { userId } });
  });

  await logAudit({
    actorId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    after: { passwordReset: true, username: target.username },
  });

  revalidatePath("/tetapan/pengguna");
  return {
    error: null,
    ok: true,
    message: `Kata laluan ${target.username} ditetapkan semula. Semua sesi mereka telah ditamatkan.`,
  };
}

// ─────────────────────────── formulari ───────────────────────────

/**
 * Menyunting satu ubat dalam formulari.
 *
 * Ini skrin yang plan rujuk apabila ia berkata doktor mesti mengesahkan dos
 * dan harga benih sebelum digunakan pada pesakit sebenar.
 *
 * Harga di sini hanya mempengaruhi preskripsi BAHARU. Item preskripsi
 * menyimpan harga seunitnya sendiri pada masa preskripsi, jadi invois lalu
 * tidak berubah apabila harga dikemas kini.
 */
export async function updateDrug(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("tetapan");

  const drugId = String(formData.get("drugId") ?? "");
  if (!drugId) return { error: "Ubat tidak dinyatakan." };

  const sellPrice = Number(formData.get("sellPrice") ?? 0);
  const reorderLevel = Number(formData.get("reorderLevel") ?? 0);
  const defaultDuration = Number(formData.get("defaultDuration") ?? 0);

  if (!Number.isFinite(sellPrice) || sellPrice < 0) return { error: "Harga jual tidak sah." };
  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
    return { error: "Paras pesanan semula mesti nombor bulat sifar atau lebih." };
  }
  if (!Number.isInteger(defaultDuration) || defaultDuration < 0) {
    return { error: "Tempoh lalai mesti nombor bulat sifar atau lebih." };
  }

  const before = await prisma.drug.findUnique({
    where: { id: drugId },
    select: { name: true, sellPrice: true, defaultDose: true, defaultFrequency: true },
  });
  if (!before) return { error: "Ubat tidak dijumpai." };

  await prisma.drug.update({
    where: { id: drugId },
    data: {
      sellPrice,
      reorderLevel,
      defaultDose: str(formData.get("defaultDose")),
      defaultFrequency: str(formData.get("defaultFrequency")),
      defaultDuration: defaultDuration > 0 ? defaultDuration : null,
      instructionsMs: str(formData.get("instructionsMs")),
      instructionsEn: str(formData.get("instructionsEn")),
      active: formData.get("active") === "on",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "Drug",
    entityId: drugId,
    before: { sellPrice: before.sellPrice.toString(), defaultDose: before.defaultDose },
    after: { sellPrice, reorderLevel },
  });

  revalidatePath("/tetapan/formulari");
  revalidatePath("/inventori");
  return { error: null, ok: true, message: `${before.name} dikemas kini.` };
}

// ─────────────────────────── harga servis ───────────────────────────

export async function updateService(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("tetapan");

  const serviceId = String(formData.get("serviceId") ?? "");
  const name = str(formData.get("name"));
  const price = Number(formData.get("price") ?? 0);

  if (!serviceId) return { error: "Servis tidak dinyatakan." };
  if (!name) return { error: "Masukkan nama servis." };
  if (!Number.isFinite(price) || price < 0) return { error: "Harga tidak sah." };

  const before = await prisma.serviceItem.findUnique({
    where: { id: serviceId },
    select: { code: true, price: true },
  });
  if (!before) return { error: "Servis tidak dijumpai." };

  await prisma.serviceItem.update({
    where: { id: serviceId },
    data: { name, price, active: formData.get("active") === "on" },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entity: "ServiceItem",
    entityId: serviceId,
    before: { price: before.price.toString() },
    after: { name, price },
  });

  revalidatePath("/tetapan/servis");
  return { error: null, ok: true, message: `${before.code} dikemas kini.` };
}

// ─────────────────────────── panel ───────────────────────────

export async function savePanel(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireArea("tetapan");

  const panelId = str(formData.get("panelId"));
  const name = str(formData.get("name"));
  const type = String(formData.get("type") ?? "CORPORATE");

  if (!name) return { error: "Masukkan nama panel." };
  if (!["CORPORATE", "TPA", "GOVT"].includes(type)) return { error: "Jenis panel tidak sah." };

  const data = {
    name,
    type: type as "CORPORATE" | "TPA" | "GOVT",
    // Kod klinik diberi oleh panel dan mesti dipetik pada setiap tuntutan;
    // ia dicetak ke dalam eksport CSV.
    clinicCode: str(formData.get("clinicCode")),
    contactPerson: str(formData.get("contactPerson")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    billingCycle: str(formData.get("billingCycle")),
    notes: str(formData.get("notes")),
    active: formData.get("active") === "on",
  };

  if (panelId) {
    await prisma.panel.update({ where: { id: panelId }, data });
    await logAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Panel",
      entityId: panelId,
      after: data,
    });
  } else {
    const clash = await prisma.panel.findUnique({ where: { name }, select: { id: true } });
    if (clash) return { error: `Panel "${name}" sudah wujud.` };

    const created = await prisma.panel.create({ data, select: { id: true } });
    await logAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Panel",
      entityId: created.id,
      after: data,
    });
  }

  revalidatePath("/tetapan/panel");
  revalidatePath("/panel");
  return { error: null, ok: true, message: `Panel ${name} disimpan.` };
}
