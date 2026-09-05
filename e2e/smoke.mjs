/**
 * Pemeriksaan asap hujung-ke-hujung terhadap pelayan yang sedang berjalan.
 *
 *   node e2e/smoke.mjs [baseUrl]
 *
 * Memandu pelayar sebenar kerana Server Actions Next tidak boleh dipanggil
 * dengan curl — ia memerlukan pengekodan permintaan dalaman Next.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";

/**
 * Gunakan Chromium yang sudah terpasang dalam imej bila ada. Versi Playwright
 * yang dipasang mungkin mengharapkan nombor binaan lain, dan memuat turun
 * pelayar baharu tidak selalu mungkin dalam persekitaran tertutup.
 */
const PREINSTALLED = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOptions = existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {};
const PASSWORD = process.env.SEED_PASSWORD ?? "klinik1234";

let failures = 0;
let pending = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * Mengesahkan bahawa sesuatu laluan menolak pengguna semasa.
 *
 * Laluan yang belum dibina dilaporkan sebagai tertunda dan bukan gagal, supaya
 * pemeriksaan ini boleh ditulis lebih awal daripada skrinnya. Halaman yang
 * sebenarnya memuatkan untuk peranan yang salah tetap dikira sebagai kegagalan.
 */
async function checkDenied(page, name, path) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  const landed = new URL(page.url()).pathname;

  if (landed === "/akses-ditolak") {
    console.log(`  ✓ ${name}`);
    return;
  }
  if (response && response.status() === 404) {
    pending += 1;
    console.log(`  · ${name} — skrin belum dibina`);
    return;
  }
  failures += 1;
  console.log(`  ✗ ${name} — halaman dimuatkan pada ${landed}`);
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

try {
  console.log("Log masuk & kawalan akses");
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Kelayakan salah mesti ditolak dan kekal di halaman log masuk.
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#username", "kaunter");
    await page.fill("#password", "salah-sama-sekali");
    await page.click('button[type="submit"]');
    await page.waitForSelector('[role="alert"]', { timeout: 15000 });
    check(
      "kata laluan salah ditolak",
      new URL(page.url()).pathname === "/login",
      `berada di ${page.url()}`,
    );

    await ctx.close();
  }

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "admin");
    check("admin boleh log masuk", new URL(page.url()).pathname === "/", page.url());

    const body = await page.textContent("body");
    check("papan pemuka menunjukkan nama pengguna", body.includes("Pentadbir Sistem"));
    check("papan pemuka menunjukkan kutipan", body.includes("Kutipan hari ini"));

    // ADMIN tidak sepatutnya membuka skrin klinikal.
    await checkDenied(page, "admin ditolak dari /konsultasi", "/konsultasi");
    await ctx.close();
  }

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "kaunter");

    const nav = await page.textContent("nav");
    check("kaunter nampak pautan Pendaftaran", nav.includes("Pendaftaran"));
    check("kaunter tidak nampak pautan Tetapan", !nav.includes("Tetapan"));

    await checkDenied(page, "kaunter ditolak dari /tetapan", "/tetapan");
    await checkDenied(page, "kaunter ditolak dari /inventori", "/inventori");
    await ctx.close();
  }
} finally {
  await browser.close();
}

const summary = pending > 0 ? ` (${pending} tertunda — skrin belum dibina)` : "";
console.log(
  failures === 0
    ? `\nSemua pemeriksaan lulus${summary}.`
    : `\n${failures} pemeriksaan gagal${summary}.`,
);
process.exit(failures === 0 ? 0 : 1);
