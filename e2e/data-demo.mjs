/**
 * Mencipta data demo yang boleh dipersembahkan.
 *
 *   node e2e/data-demo.mjs [baseUrl]
 *
 * Dipandu melalui UI sebenar dan bukan sisipan Prisma terus. Memasukkan baris
 * terus akan memintas setiap invarian yang dibina sistem ini — lejar stok,
 * penjujukan nombor, penguncian harga, peraturan satu-lawatan-terbuka. Memandu
 * aplikasi menjamin data demo mematuhi peraturan yang sama seperti data sebenar.
 *
 * Enam pesakit ditinggalkan pada peringkat berbeza supaya setiap skrin ada isi.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = process.env.SEED_PASSWORD ?? "klinik1234";

const PREINSTALLED = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOptions = existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {};

/**
 * Nombor IC direka supaya penghurai menghasilkan umur dan jantina yang betul.
 * Kod tempat lahir 10 ialah Selangor; digit akhir ganjil = lelaki.
 */
const PATIENTS = [
  {
    ic: "920315105544",
    name: "Nurul Aisyah binti Rahman",
    phone: "012-3456789",
    stage: "menunggu",
    complaint: "Demam dan sakit tekak sejak 2 hari",
  },
  {
    ic: "740822105237",
    name: "Tan Wei Ming",
    phone: "016-7788990",
    stage: "dalam-rawatan",
    complaint: "Semakan tekanan darah, ubat hampir habis",
    history: "Hipertensi sejak 2019. Amlodipine 5mg harian.",
    examination: "Tiada edema. Bunyi jantung normal.",
    notes: "Teruskan Amlodipine. Kurangkan garam. Semak semula 1 bulan.",
    vitals: { weight: "78", height: "170", systolic: "148", diastolic: "92", pulse: "76", temp: "36.8" },
    diagnosis: { cari: "darah tinggi", pilih: "Darah tinggi" },
    ubat: ["Amlodipine 5mg"],
  },
  {
    ic: "650430105891",
    name: "Muthu a/l Samy",
    phone: "019-2233445",
    stage: "dispensari",
    complaint: "Semakan kencing manis rutin",
    history: "Diabetes jenis 2 sejak 2015. Alahan Penicillin.",
    examination: "Kaki tiada ulser. Denyut nadi kaki baik.",
    notes: "Gula terkawal. Teruskan Metformin. HbA1c dalam 3 bulan.",
    vitals: { weight: "72", height: "165", systolic: "132", diastolic: "84", pulse: "80", temp: "36.6", glucose: "7.8" },
    alahan: { bahan: "Penicillin", reaksi: "Ruam kulit teruk", tahap: "TERUK" },
    diagnosis: { cari: "kencing manis", pilih: "Kencing manis" },
    ubat: ["Metformin 500mg"],
  },
  {
    ic: "980712106028",
    name: "Siti Khadijah binti Osman",
    phone: "011-23456789",
    stage: "bayaran",
    panel: true,
    employeeId: "TNB-88214",
    complaint: "Sakit belakang selepas mengangkat kotak",
    examination: "Otot lumbar tegang. Tiada defisit neurologi.",
    notes: "Rehat 2 hari. Elak angkat berat.",
    vitals: { weight: "58", height: "158", systolic: "118", diastolic: "76", pulse: "72", temp: "36.7" },
    diagnosis: { cari: "sakit belakang", pilih: "Sakit belakang" },
    ubat: [],
  },
  {
    ic: "190205105613",
    name: "Ahmad Zaki bin Ismail",
    phone: "013-4455667",
    stage: "selesai",
    complaint: "Demam 38.9°C sejak semalam, batuk kering",
    examination: "Tekak merah. Paru-paru jernih.",
    notes: "Jangkitan virus. Beri paracetamol. Kembali jika demam melebihi 3 hari.",
    vitals: { weight: "22", height: "118", pulse: "104", temp: "38.9" },
    diagnosis: { cari: "demam", pilih: "Demam" },
    ubat: ["Paracetamol Sirap 120mg/5ml"],
    mc: 2,
  },
  {
    ic: "810918106144",
    name: "Lim Siew Hoon",
    phone: "017-8899001",
    stage: "selesai",
    complaint: "Gastrik, sakit ulu hati selepas makan",
    examination: "Abdomen lembut, tender epigastrik ringan.",
    notes: "Elak makanan pedas dan kopi. Omeprazole 2 minggu.",
    vitals: { weight: "62", height: "162", systolic: "122", diastolic: "78", pulse: "74", temp: "36.5" },
    diagnosis: { cari: "gastro", pilih: "Refluks" },
    ubat: ["Omeprazole 20mg"],
  },
];

async function waitForPath(page, predicate, timeout = 20000) {
  await page.waitForFunction(
    (fnBody) => new Function("p", `return (${fnBody})(p)`)(location.pathname),
    predicate.toString(),
    { timeout },
  );
}

/** Tunggu React memasang sebelum menyentuh medan yang dikawal React. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
}

async function login(page, username) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", username);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await waitForPath(page, (p) => !p.startsWith("/login"));
}

async function daftar(page, patient) {
  await page.goto(`${BASE}/pendaftaran/baru`, { waitUntil: "load" });
  await settle(page);

  await page.fill("#idNumber", patient.ic);
  await page.fill("#name", patient.name);
  await page.fill("#phone", patient.phone);
  await page.fill("#addressLine1", "No. 12, Jalan Semenyih Indah 3");
  await page.fill("#postcode", "43500");
  await page.check('input[name="consent"]');
  await page.click('button:has-text("Simpan pesakit")');
  await waitForPath(page, (p) => p.startsWith("/pendaftaran/pesakit/"));

  // Penanggung kos ialah pemilih terkawal React — mesti selepas hydration.
  await settle(page);
  if (patient.panel) {
    await page.selectOption("#payerType", "PANEL");
    await page.waitForSelector("#panelId", { timeout: 10000 });
    await page.selectOption("#panelId", { index: 1 });
    await page.fill("#employeeId", patient.employeeId);
  }
  await page.click('button:has-text("Daftar lawatan")');
  await waitForPath(page, (p) => p.startsWith("/queue"));
  console.log(`  daftar: ${patient.name}`);
}

async function konsultasi(doc, patient, { tutup }) {
  await doc.goto(`${BASE}/konsultasi`, { waitUntil: "load" });
  await settle(doc);

  const row = doc.locator("tr", { hasText: patient.name });
  await row.locator('button:has-text("Mula rawatan")').click();
  await waitForPath(doc, (p) => /^\/konsultasi\/[^/]+$/.test(p));
  await settle(doc);

  if (patient.alahan) {
    await doc.click('button:has-text("Rekod alahan")');
    await doc.waitForSelector("#allergen", { timeout: 10000 });
    await doc.fill("#allergen", patient.alahan.bahan);
    await doc.fill("#reaction", patient.alahan.reaksi);
    await doc.selectOption("#severity", patient.alahan.tahap);
    await doc.click('button:has-text("Simpan alahan")');
    await doc.waitForFunction(
      () => document.querySelector("main")?.textContent?.includes("⚠ ALAHAN"),
      null,
      { timeout: 15000 },
    );
  }

  const v = patient.vitals ?? {};
  for (const [id, value] of [
    ["#temperature", v.temp],
    ["#systolic", v.systolic],
    ["#diastolic", v.diastolic],
    ["#pulse", v.pulse],
    ["#weightKg", v.weight],
    ["#heightCm", v.height],
    ["#bloodGlucose", v.glucose],
  ]) {
    if (value) await doc.fill(id, value);
  }
  await doc.click('button:has-text("Simpan tanda vital")');
  await doc.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Tanda vital disimpan"),
    null,
    { timeout: 15000 },
  );

  if (patient.complaint) await doc.fill("#presentingComplaint", patient.complaint);
  if (patient.history) await doc.fill("#history", patient.history);
  if (patient.examination) await doc.fill("#examination", patient.examination);
  if (patient.notes) await doc.fill("#notes", patient.notes);
  await doc.click('button:has-text("Simpan nota")');
  await doc.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Nota konsultasi disimpan"),
    null,
    { timeout: 15000 },
  );

  await doc.fill('input[aria-label="Cari diagnosis"]', patient.diagnosis.cari);
  await doc.waitForSelector(`button:has-text("${patient.diagnosis.pilih}")`, { timeout: 10000 });
  await doc.click(`button:has-text("${patient.diagnosis.pilih}")`);
  await doc.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Utama"),
    null,
    { timeout: 15000 },
  );

  for (const ubat of patient.ubat ?? []) {
    await doc.fill('input[aria-label="Cari ubat"]', ubat);
    await doc.waitForSelector(`button:has-text("${ubat}")`, { timeout: 10000 });
    await doc.click(`button:has-text("${ubat}")`);
    await doc.waitForSelector('button:has-text("Tambah ke preskripsi")', { timeout: 10000 });
    await doc.click('button:has-text("Tambah ke preskripsi")');
    await doc.waitForFunction(
      (nama) => {
        const rows = document.querySelectorAll("main table tbody tr");
        return [...rows].some((r) => r.textContent?.includes(nama));
      },
      ubat,
      { timeout: 15000 },
    );
  }

  if (patient.mc) {
    await doc.click('button:has-text("Keluarkan MC")');
    await doc.waitForSelector("#fromDate", { timeout: 10000 });
    const from = await doc.inputValue("#fromDate");
    const to = new Date(`${from}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + patient.mc - 1);
    await doc.fill("#toDate", to.toISOString().slice(0, 10));
    await doc.fill("#mcReason", "Demam virus");
    await doc.click('button:has-text("Keluarkan MC")>>nth=-1');
    await doc.waitForFunction(
      () => /MC-\d{4}-\d{5}/.test(document.querySelector("main")?.textContent ?? ""),
      null,
      { timeout: 15000 },
    );
  }

  if (tutup) {
    await doc.click('button:has-text("Tutup konsultasi")');
    await waitForPath(doc, (p) => p === "/konsultasi");
  }
  console.log(`  konsultasi: ${patient.name}${tutup ? " (ditutup)" : " (dibiarkan terbuka)"}`);
}

async function dispense(pharm, patient, { selesai }) {
  await pharm.goto(`${BASE}/dispensari`, { waitUntil: "load" });
  await settle(pharm);

  const row = pharm.locator("tr", { hasText: patient.name });
  await row.locator('a:has-text("Sediakan ubat")').click();
  await waitForPath(pharm, (p) => /^\/dispensari\/[^/]+$/.test(p));
  await settle(pharm);

  const buttons = pharm.locator('button:has-text("Sahkan & tolak stok")');
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    await buttons.first().click();
    await pharm.waitForFunction(
      (n) => (document.querySelector("main")?.textContent?.match(/Disediakan/g) ?? []).length >= n,
      i + 1,
      { timeout: 20000 },
    );
  }

  if (selesai) {
    await pharm.click('button:has-text("Selesai & hantar ke kaunter")');
    await waitForPath(pharm, (p) => p === "/dispensari");
  }
  console.log(`  dispensari: ${patient.name}${selesai ? " (selesai)" : " (menunggu)"}`);
}

async function bayar(cash, patient) {
  await cash.goto(`${BASE}/bil`, { waitUntil: "load" });
  await settle(cash);

  const row = cash.locator("tr", { hasText: patient.name });
  await row.locator('a:has-text("Buka bil")').click();
  await waitForPath(cash, (p) => /^\/bil\/[^/]+$/.test(p));
  await settle(cash);

  await cash.click('button:has-text("Keluarkan invois")');
  await cash.waitForFunction(
    () => /INV-\d{4}-\d{5}/.test(document.querySelector("main")?.textContent ?? ""),
    null,
    { timeout: 20000 },
  );

  const payButton = cash.locator('button:has-text("Terima bayaran")');
  if (await payButton.count()) {
    await payButton.click();
    await cash.waitForFunction(
      () => document.querySelector("main")?.textContent?.includes("Bayaran diterima"),
      null,
      { timeout: 20000 },
    );
  }

  await cash.click('button:has-text("Tutup lawatan")');
  await waitForPath(cash, (p) => p === "/bil");
  console.log(`  bil: ${patient.name} (selesai)`);
}

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

try {
  const front = await ctx.newPage();
  await login(front, "kaunter");

  console.log("Mendaftar pesakit");
  for (const patient of PATIENTS) {
    await daftar(front, patient);
  }

  const docCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const doc = await docCtx.newPage();
  await login(doc, "doktor");

  console.log("\nKonsultasi");
  for (const patient of PATIENTS) {
    if (patient.stage === "menunggu") continue;
    // Seorang pesakit dibiarkan terbuka supaya skrin "dalam rawatan" ada isi.
    await konsultasi(doc, patient, { tutup: patient.stage !== "dalam-rawatan" });
  }

  const pharmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pharm = await pharmCtx.newPage();
  await login(pharm, "farmasi");

  console.log("\nDispensari");
  for (const patient of PATIENTS) {
    if (patient.stage !== "selesai") continue;
    if ((patient.ubat ?? []).length === 0) continue;
    await dispense(pharm, patient, { selesai: true });
  }

  console.log("\nKaunter bayaran");
  for (const patient of PATIENTS) {
    if (patient.stage !== "selesai") continue;
    await bayar(front, patient);
  }

  await docCtx.close();
  await pharmCtx.close();
} finally {
  await ctx.close();
  await browser.close();
}

console.log("\nData demo siap.");
