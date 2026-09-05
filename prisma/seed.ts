/**
 * Menanam data rujukan dan akaun pengguna permulaan.
 *
 * Idempoten — selamat dijalankan berulang kali. Rekod sedia ada dikemas kini,
 * tiada rekod klinikal disentuh.
 *
 *   npm run db:seed
 */

// .env tidak dimuatkan secara automatik oleh Node, sama seperti prisma7.config.ts.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "@/generated/prisma/client";
import { DRUGS, ICD10, PANELS, SERVICES } from "./seed-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL tidak ditetapkan. Salin .env.example ke .env.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const CLINIC_ID = "klinik-utama";

/**
 * Kata laluan permulaan untuk akaun benih. Boleh diganti melalui SEED_PASSWORD.
 * Ini untuk persediaan sahaja — setiap kakitangan mesti menukar kata laluan
 * masing-masing sebelum klinik beroperasi.
 */
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "klinik1234";

async function seedClinic() {
  const data = {
    name: "Klinik Contoh Semenyih",
    registrationNo: null,
    addressLine1: "No. 1, Jalan Semenyih",
    addressLine2: null,
    postcode: "43500",
    city: "Semenyih",
    state: "Selangor",
    phone: "03-8000 0000",
    email: null,
  };
  await prisma.clinic.upsert({
    where: { id: CLINIC_ID },
    create: { id: CLINIC_ID, ...data },
    // Nama dan alamat sebenar diuruskan melalui skrin Tetapan, jadi jangan
    // tulis ganti nilai yang sudah disunting oleh klinik.
    update: {},
  });
  console.log("  klinik      : sedia");
}

async function seedUsers() {
  const passwordHash = await hash(SEED_PASSWORD, 12);
  const users = [
    { username: "admin", name: "Pentadbir Sistem", role: "ADMIN" as const, mmcNumber: null },
    { username: "doktor", name: "Dr. Contoh", role: "DOCTOR" as const, mmcNumber: "MMC-00000" },
    { username: "jururawat", name: "Jururawat Contoh", role: "NURSE" as const, mmcNumber: null },
    { username: "kaunter", name: "Kaunter Contoh", role: "FRONTDESK" as const, mmcNumber: null },
    { username: "farmasi", name: "Farmasi Contoh", role: "PHARMACY" as const, mmcNumber: null },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      create: { ...u, passwordHash },
      // Jangan set semula kata laluan yang sudah ditukar oleh kakitangan.
      update: { name: u.name, role: u.role, mmcNumber: u.mmcNumber },
    });
  }
  console.log(`  pengguna    : ${users.length} akaun`);
}

async function seedIcd10() {
  for (const c of ICD10) {
    await prisma.icd10Code.upsert({
      where: { code: c.code },
      create: c,
      update: { description: c.description, category: c.category },
    });
  }
  console.log(`  ICD-10      : ${ICD10.length} kod`);
}

async function seedServices() {
  for (const s of SERVICES) {
    await prisma.serviceItem.upsert({
      where: { code: s.code },
      create: s,
      // Harga adalah keputusan klinik — jangan tulis ganti selepas disunting.
      update: { name: s.name, category: s.category },
    });
  }
  console.log(`  servis      : ${SERVICES.length} item`);
}

async function seedPanels() {
  for (const p of PANELS) {
    await prisma.panel.upsert({
      where: { name: p.name },
      create: p,
      update: { type: p.type, billingCycle: p.billingCycle, notes: p.notes },
    });
  }
  console.log(`  panel       : ${PANELS.length} panel`);
}

/**
 * Ubat, ditambah dengan satu batch stok permulaan setiap satu supaya sistem
 * boleh diuji hujung-ke-hujung sejurus selepas pemasangan.
 *
 * Tiga ubat pertama mendapat DUA batch dengan tarikh luput berbeza — ini
 * memberi dispensari kes sebenar untuk mengesahkan pemilihan FEFO.
 */
async function seedDrugs() {
  const today = new Date();
  let batchCount = 0;

  for (const [index, d] of DRUGS.entries()) {
    const drug = await prisma.drug.upsert({
      where: { name: d.name },
      create: {
        name: d.name,
        genericName: d.genericName ?? null,
        strength: d.strength ?? null,
        form: d.form,
        unit: d.unit,
        isControlled: d.isControlled ?? false,
        defaultDose: d.defaultDose,
        defaultFrequency: d.defaultFrequency,
        defaultDuration: d.defaultDuration,
        instructionsMs: d.instructionsMs,
        instructionsEn: d.instructionsEn,
        sellPrice: d.sellPrice,
        reorderLevel: d.reorderLevel,
      },
      // Harga jual ialah keputusan klinik; kekalkan nilai yang telah disunting.
      update: {
        genericName: d.genericName ?? null,
        strength: d.strength ?? null,
        form: d.form,
        unit: d.unit,
        isControlled: d.isControlled ?? false,
        defaultDose: d.defaultDose,
        defaultFrequency: d.defaultFrequency,
        defaultDuration: d.defaultDuration,
        instructionsMs: d.instructionsMs,
        instructionsEn: d.instructionsEn,
      },
    });

    // Batch kedua untuk tiga ubat pertama, luput lebih awal, supaya FEFO
    // mempunyai pilihan yang benar-benar berbeza untuk diuji.
    const offsets = index < 3 ? [18, 4] : [12];

    for (const months of offsets) {
      const expiry = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + months, 1),
      );
      const batchNo = `SEED-${months}M`;
      const quantity = Math.max(d.reorderLevel * 2, 20);

      const existing = await prisma.drugBatch.findUnique({
        where: {
          drugId_batchNo_expiryDate: { drugId: drug.id, batchNo, expiryDate: expiry },
        },
        select: { id: true },
      });
      if (existing) continue;

      // Batch dan lejarnya dicipta bersama supaya baki sentiasa boleh
      // diterangkan oleh pergerakan stok.
      await prisma.$transaction(async (tx) => {
        const batch = await tx.drugBatch.create({
          data: {
            drugId: drug.id,
            batchNo,
            expiryDate: expiry,
            quantityOnHand: quantity,
            supplier: "Stok permulaan",
          },
        });
        await tx.stockMovement.create({
          data: {
            drugId: drug.id,
            batchId: batch.id,
            type: "RECEIVE",
            quantity,
            reason: "Stok permulaan daripada seed",
          },
        });
      });
      batchCount += 1;
    }
  }
  console.log(`  ubat        : ${DRUGS.length} ubat, ${batchCount} batch baharu`);
}

async function main() {
  console.log("Menanam data klinik...");
  await seedClinic();
  await seedUsers();
  await seedIcd10();
  await seedServices();
  await seedPanels();
  await seedDrugs();

  console.log("\nSelesai.");
  console.log(`\n  Log masuk: admin / doktor / jururawat / kaunter / farmasi`);
  console.log(`  Kata laluan: ${SEED_PASSWORD}`);
  console.log("\n  ⚠️  Tukar semua kata laluan sebelum klinik beroperasi.");
  console.log("  ⚠️  Harga dan dos ubat adalah CONTOH — doktor mesti sahkan");
  console.log("      formulari melalui Tetapan sebelum guna pada pesakit.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
