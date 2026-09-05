/**
 * Perjalanan pesakit hujung-ke-hujung terhadap pelayan yang sedang berjalan.
 *
 *   node e2e/perjalanan.mjs [baseUrl]
 *
 * Mengikuti laluan sebenar seorang pesakit melalui klinik. Fasa baharu
 * menambah langkah di penghujung fail ini.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = process.env.SEED_PASSWORD ?? "klinik1234";

const PREINSTALLED = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOptions = existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {};

let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * IC ujian dengan tarikh lahir dan jantina TETAP, tetapi siri rawak supaya
 * ujian boleh dijalankan berulang kali tanpa berlanggar dengan pesakit
 * daripada larian sebelumnya.
 *   900101 = 1 Januari 1990   10 = Selangor   digit akhir 3 (ganjil) = lelaki
 */
function testIc() {
  const serial = String(Math.floor(Math.random() * 900) + 100);
  return `900101` + `10` + serial + `3`;
}

async function login(page, username) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", username);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  const ic = testIc();
  const name = `Pesakit Ujian ${Date.now().toString().slice(-6)}`;

  console.log("1. Pendaftaran pesakit baharu");
  await login(page, "kaunter");
  await page.goto(`${BASE}/pendaftaran/baru`, { waitUntil: "domcontentloaded" });

  // Menaip IC sepatutnya mengisi tarikh lahir dan jantina.
  await page.fill("#idNumber", ic);
  await page.waitForFunction(
    () => document.querySelector("#dob")?.value === "1990-01-01",
    null,
    { timeout: 5000 },
  );
  check("IC mengisi tarikh lahir", (await page.inputValue("#dob")) === "1990-01-01");
  check("IC mengisi jantina", (await page.inputValue("#gender")) === "LELAKI");

  const hint = await page.textContent("main form");
  check("IC menunjukkan negeri kelahiran", hint.includes("Selangor"));

  await page.fill("#name", name);

  // Persetujuan PDPA wajib — cuba simpan tanpanya dahulu.
  await page.click('button:has-text("Simpan pesakit")');
  check(
    "borang menghalang simpanan tanpa persetujuan",
    new URL(page.url()).pathname === "/pendaftaran/baru",
    page.url(),
  );

  await page.check('input[name="consent"]');
  await Promise.all([
    page.waitForURL(/\/pendaftaran\/pesakit\//, { timeout: 15000 }),
    page.click('button:has-text("Simpan pesakit")'),
  ]);
  check("pesakit disimpan", /\/pendaftaran\/pesakit\//.test(page.url()), page.url());

  const record = await page.textContent("body");
  check("rekod menunjukkan nama pesakit", record.includes(name));
  check("rekod menunjukkan umur dikira", record.includes("thn"));
  check("rekod menunjukkan persetujuan PDPA", record.includes("Diberi"));

  console.log("\n2. Daftar lawatan dan nombor giliran");
  await Promise.all([
    page.waitForURL(/\/queue/, { timeout: 15000 }),
    page.click('button:has-text("Daftar lawatan")'),
  ]);

  const queueNo = new URL(page.url()).searchParams.get("baru");
  check("lawatan mencipta nombor giliran", Boolean(queueNo), page.url());

  const board = await page.textContent("body");
  check("giliran muncul pada papan", board.includes(name));
  check("papan menunjukkan lajur menunggu", board.includes("Menunggu doktor"));

  // Skrin TV mesti menunjukkan nombor yang sama.
  await page.goto(`${BASE}/paparan`, { waitUntil: "domcontentloaded" });
  const display = await page.textContent("main");
  check("nombor giliran muncul pada skrin TV", display.includes(String(queueNo)));

  console.log("\n3. Pesakit yang sama tidak boleh ada dua lawatan terbuka");
  await page.goto(`${BASE}/pendaftaran?cari=${ic}`, { waitUntil: "domcontentloaded" });
  const found = await page.textContent("body");
  check("carian mencari pesakit melalui IC", found.includes(name));

  await page.click(`a:has-text("Buka")`);
  await page.waitForURL(/\/pendaftaran\/pesakit\//, { timeout: 15000 });
  const reopened = await page.textContent("body");
  check("rekod menunjukkan amaran lawatan terbuka", reopened.includes("Lawatan terbuka"));

  console.log("\n4. Konsultasi doktor");
  // Konteks baharu supaya kaunter kekal log masuk pada yang pertama.
  const doctorCtx = await browser.newContext();
  const doc = await doctorCtx.newPage();
  await login(doc, "doktor");

  await doc.goto(`${BASE}/konsultasi`, { waitUntil: "domcontentloaded" });
  const listBody = await doc.textContent("body");
  check("pesakit muncul dalam senarai konsultasi", listBody.includes(name));

  // Mula rawatan pada baris pesakit ini.
  const row = doc.locator("tr", { hasText: name });
  await Promise.all([
    doc.waitForURL(/\/konsultasi\/[^/]+$/, { timeout: 15000 }),
    row.locator('button:has-text("Mula rawatan")').click(),
  ]);
  check("konsultasi dibuka", /\/konsultasi\/[^/]+$/.test(doc.url()), doc.url());

  const fresh = await doc.textContent("main");
  check("tiada alahan direkod pada mulanya", fresh.includes("Tiada alahan direkod"));

  // ── Alahan mesti muncul sebagai amaran merah ──
  await doc.click('button:has-text("Rekod alahan")');
  await doc.fill("#allergen", "Penicillin");
  await doc.fill("#reaction", "Ruam teruk");
  await doc.selectOption("#severity", "TERUK");
  await doc.click('button:has-text("Simpan alahan")');
  await doc.waitForFunction(
    () => document.body.textContent.includes("⚠ ALAHAN"),
    null,
    { timeout: 10000 },
  );
  const withAllergy = await doc.textContent("main");
  check("banner alahan muncul", withAllergy.includes("⚠ ALAHAN"));
  check("banner menunjukkan bahan alahan", withAllergy.includes("Penicillin"));

  // ── BMI dikira daripada berat dan tinggi ──
  await doc.fill("#weightKg", "70");
  await doc.fill("#heightCm", "170");
  await doc.waitForFunction(
    () => document.querySelector('[data-testid="bmi"]')?.textContent?.includes("24.2"),
    null,
    { timeout: 5000 },
  );
  check("BMI dikira dengan betul", true);
  await doc.click('button:has-text("Simpan tanda vital")');
  await doc.waitForFunction(
    () => document.body.textContent.includes("Tanda vital disimpan"),
    null,
    { timeout: 10000 },
  );
  check("tanda vital disimpan", true);

  // ── Menutup tanpa diagnosis mesti ditolak ──
  await doc.click('button:has-text("Tutup konsultasi")');
  await doc.waitForFunction(
    () => document.body.textContent.includes("sekurang-kurangnya satu diagnosis"),
    null,
    { timeout: 10000 },
  );
  check("menutup tanpa diagnosis ditolak", true);

  // ── Diagnosis ICD-10 ──
  await doc.fill('input[aria-label="Cari diagnosis"]', "demam");
  await doc.waitForSelector('button:has-text("Demam")', { timeout: 5000 });
  await doc.click('button:has-text("Demam")');
  // Tunggu badge "Utama" DALAM kandungan utama.
  //
  // Menunggu "R50.9" tidak berfungsi: kod itu masih dipaparkan dalam senarai
  // cadangan carian, jadi ia sepadan sebelum senarai diagnosis dikemas kini.
  // Menunggu "Utama" pada document.body juga tidak berfungsi — itu label
  // pautan navigasi dashboard. Hanya "Utama" di dalam <main> yang unik.
  await doc.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Utama"),
    null,
    { timeout: 10000 },
  );
  const withDx = await doc.textContent("main");
  check("diagnosis ditambah", withDx.includes("R50.9"));
  check("diagnosis pertama ditanda utama", withDx.includes("Utama"));

  // ── Preskripsi: kuantiti dikira automatik ──
  await doc.fill('input[aria-label="Cari ubat"]', "Paracetamol 500");
  await doc.waitForSelector('button:has-text("Paracetamol 500mg")', { timeout: 5000 });
  await doc.click('button:has-text("Paracetamol 500mg")');

  // Lalai formulari: dos "1-2", 4 kali sehari, 3 hari.
  // Had atas julat digunakan: 2 x 4 x 3 = 24.
  await doc.waitForSelector('text=Dikira: 24', { timeout: 5000 });
  check("kuantiti dikira daripada dos x kekerapan x tempoh", true);

  await doc.click('button:has-text("Tambah ke preskripsi")');
  await doc.waitForFunction(
    () => document.body.textContent.includes("24 biji"),
    null,
    { timeout: 10000 },
  );
  const withRx = await doc.textContent("main");
  check("ubat ditambah dengan kuantiti dikira", withRx.includes("24 biji"));
  check("arahan label BM disimpan", withRx.includes("4 kali sehari"));

  // ── Tutup konsultasi, pesakit ke dispensari ──
  await Promise.all([
    doc.waitForURL(/\/konsultasi$/, { timeout: 15000 }),
    doc.click('button:has-text("Tutup konsultasi")'),
  ]);
  check("konsultasi ditutup", /\/konsultasi$/.test(doc.url()), doc.url());

  await doc.goto(`${BASE}/queue`, { waitUntil: "domcontentloaded" });
  const board2 = await doc.textContent("main");
  check("pesakit berpindah ke dispensari", board2.includes(name));

  await doctorCtx.close();
} finally {
  await ctx.close();
  await browser.close();
}

console.log(failures === 0 ? "\nSemua pemeriksaan lulus." : `\n${failures} pemeriksaan gagal.`);
process.exit(failures === 0 ? 0 : 1);
