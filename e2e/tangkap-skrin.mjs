/**
 * Menangkap skrin sistem untuk semakan visual.
 *
 *   node e2e/tangkap-skrin.mjs [baseUrl]
 *
 * Gagal dengan kuat jika mana-mana skrin tidak memuat atau kandungan yang
 * dijangka tiada — menghantar tangkapan skrin halaman ralat secara senyap
 * lebih teruk daripada gagal.
 */
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.env.SHOT_DIR ?? "skrin";
const PASSWORD = process.env.SEED_PASSWORD ?? "klinik1234";

const PREINSTALLED = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOptions = existsSync(PREINSTALLED) ? { executablePath: PREINSTALLED } : {};

const ID = {
  tan: process.env.TAN_VISIT,
  muthu: process.env.MUTHU_VISIT,
  siti: process.env.SITI_VISIT,
  zaki: process.env.ZAKI_VISIT,
  invois: process.env.ZAKI_INVOICE,
  mc: process.env.ZAKI_MC,
};
for (const [key, value] of Object.entries(ID)) {
  if (!value) throw new Error(`ID hilang untuk "${key}" — tetapkan pembolehubah persekitaran.`);
}

mkdirSync(OUT, { recursive: true });

let n = 0;
const captured = [];

async function login(page, username) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", username);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 20000 });
}

/**
 * Menangkap satu skrin.
 *
 * `mesti` ialah teks yang wajib ada pada halaman. Jika ia tiada, halaman itu
 * bukan yang kita fikir — gagal dan bukan simpan gambar yang mengelirukan.
 */
async function shot(page, nama, { url, mesti, penuh = true, elemen = null, sebelum = null }) {
  n += 1;
  const fail = `${OUT}/${String(n).padStart(2, "0")}-${nama}.png`;

  if (url) {
    const res = await page.goto(`${BASE}${url}`, { waitUntil: "load" });
    if (res && res.status() >= 400) {
      throw new Error(`${nama}: ${url} pulangkan HTTP ${res.status()}`);
    }
  }
  await page.waitForLoadState("networkidle");

  // Penunjuk pembangunan Next.js bukan sebahagian produk — sembunyikan supaya
  // tangkapan skrin menunjukkan apa yang kakitangan klinik akan lihat.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  if (sebelum) await sebelum(page);

  for (const teks of [].concat(mesti ?? [])) {
    const body = await page.textContent("body");
    if (!body.includes(teks)) {
      throw new Error(`${nama}: teks yang dijangka tiada: "${teks}"`);
    }
  }

  if (elemen) {
    await page.locator(elemen).first().screenshot({ path: fail });
  } else {
    await page.screenshot({ path: fail, fullPage: penuh });
  }

  captured.push(fail);
  console.log(`  ${fail}`);
}

const browser = await chromium.launch(launchOptions);

try {
  // ── Skrin awam ──
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guest = await anon.newPage();
  await shot(guest, "log-masuk", {
    url: "/login",
    mesti: ["Klinik Contoh Semenyih", "Log Masuk"],
    penuh: false,
  });
  await anon.close();

  // ── Kaunter depan ──
  const frontCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const front = await frontCtx.newPage();
  await login(front, "kaunter");

  await shot(front, "pendaftaran", {
    url: "/pendaftaran",
    mesti: ["Pendaftaran hari ini", "Nurul Aisyah binti Rahman"],
  });

  await shot(front, "pesakit-baharu-auto-isi", {
    url: "/pendaftaran/baru",
    mesti: ["lahir di Selangor"],
    sebelum: async (page) => {
      // Tunjukkan penghurai MyKad mengisi tarikh lahir, jantina dan negeri.
      await page.fill("#idNumber", "900101105533");
      await page.waitForFunction(
        () => document.querySelector("#dob")?.value === "1990-01-01",
        null,
        { timeout: 10000 },
      );
      await page.fill("#name", "Ahmad Firdaus bin Abdullah");
    },
  });

  await shot(front, "papan-giliran", {
    url: "/queue",
    mesti: ["Menunggu doktor", "Dalam rawatan", "Dispensari", "Menunggu bayaran"],
  });

  await shot(front, "skrin-tv-ruang-menunggu", {
    url: "/paparan",
    mesti: ["Nombor Giliran", "Sedang dipanggil"],
    penuh: false,
  });

  await shot(front, "bil-panel", {
    url: `/bil/${ID.siti}`,
    mesti: ["Siti Khadijah binti Osman", "tidak membayar di kaunter"],
  });

  await shot(front, "tutup-kaunter", {
    url: "/bil/tutup-kaunter",
    mesti: ["Kutipan diterima", "Kutipan mengikut kaedah"],
  });

  // Resit terma 80mm — tangkap elemen supaya lebar sebenar kelihatan jujur.
  const receiptCtx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const receipt = await receiptCtx.newPage();
  await login(receipt, "kaunter");
  await shot(receipt, "resit-80mm", {
    url: `/print/resit/${ID.invois}`,
    mesti: ["Klinik Contoh Semenyih", "Ahmad Zaki bin Ismail", "JUMLAH"],
    elemen: ".receipt",
  });
  await receiptCtx.close();

  // ── Doktor ──
  const docCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const doc = await docCtx.newPage();
  await login(doc, "doktor");

  await shot(doc, "senarai-konsultasi", {
    url: "/konsultasi",
    mesti: ["Senarai konsultasi", "Tan Wei Ming"],
  });

  await shot(doc, "konsultasi-terbuka", {
    url: `/konsultasi/${ID.tan}`,
    mesti: ["Tan Wei Ming", "Tanda vital", "Diagnosis", "Preskripsi"],
  });

  await shot(doc, "konsultasi-amaran-alahan", {
    url: `/konsultasi/${ID.muthu}`,
    mesti: ["Muthu a/l Samy", "⚠ ALAHAN", "Penicillin"],
  });

  // Dokumen A4.
  const a4Ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });
  const a4 = await a4Ctx.newPage();
  await login(a4, "doktor");
  await shot(a4, "sijil-cuti-sakit", {
    url: `/print/mc/${ID.mc}`,
    mesti: ["Sijil Cuti Sakit", "Ahmad Zaki bin Ismail", "kedua-dua tarikh termasuk"],
    elemen: ".doc",
  });
  await a4Ctx.close();

  await shot(doc, "laporan", {
    url: "/laporan",
    mesti: ["Kutipan mengikut kaedah", "Diagnosis teratas", "Penggunaan ubat"],
  });

  await docCtx.close();

  // ── Farmasi ──
  const pharmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pharm = await pharmCtx.newPage();
  await login(pharm, "farmasi");

  await shot(pharm, "dispensari-fefo", {
    url: `/dispensari/${ID.muthu}`,
    mesti: ["Muthu a/l Samy", "⚠ ALAHAN", "Cadangan FEFO"],
  });

  await shot(pharm, "inventori", {
    url: "/inventori",
    mesti: ["Inventori ubat", "Perlu dipesan", "Hampir luput"],
  });

  // Label ubat 70x40mm.
  const labelCtx = await browser.newContext({ viewport: { width: 420, height: 400 } });
  const label = await labelCtx.newPage();
  await login(label, "farmasi");
  await shot(label, "label-ubat", {
    url: `/print/label/lawatan/${ID.zaki}`,
    mesti: ["Ahmad Zaki bin Ismail", "Simpan jauh dari kanak-kanak"],
    elemen: ".label",
  });
  await labelCtx.close();
  await pharmCtx.close();

  // ── Pentadbir ──
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await adminCtx.newPage();
  await login(admin, "admin");

  await shot(admin, "papan-pemuka", {
    url: "/",
    mesti: ["Selamat datang", "Kutipan hari ini"],
  });

  await shot(admin, "panel-tuntutan", {
    url: "/panel",
    mesti: ["Panel & tuntutan", "Belum dituntut", "PRIMIS"],
  });

  await shot(admin, "tetapan-formulari", {
    url: "/tetapan/formulari",
    mesti: ["Formulari ubat", "Semakan doktor diperlukan"],
  });

  await shot(admin, "tetapan-pengguna", {
    url: "/tetapan/pengguna",
    mesti: ["Senarai pengguna", "jejak audit PDPA"],
  });

  await adminCtx.close();
  await frontCtx.close();
} finally {
  await browser.close();
}

console.log(`\n${captured.length} tangkapan skrin disimpan dalam ${OUT}/`);
