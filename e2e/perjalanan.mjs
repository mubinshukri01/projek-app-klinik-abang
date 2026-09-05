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
} finally {
  await ctx.close();
  await browser.close();
}

console.log(failures === 0 ? "\nSemua pemeriksaan lulus." : `\n${failures} pemeriksaan gagal.`);
process.exit(failures === 0 ? 0 : 1);
