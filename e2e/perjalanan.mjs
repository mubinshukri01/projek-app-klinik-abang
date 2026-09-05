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

/**
 * Selepas React memasang, ubah hala tindakan pelayan ialah navigasi sisi
 * klien — tiada event "load" yang dilepaskan, jadi waitForURL lalai akan
 * tergantung. Tinjau laluan sebenar sebaliknya.
 */
async function waitForPath(page, predicate, timeout = 15000) {
  await page.waitForFunction(
    (fnBody) => new Function("p", `return (${fnBody})(p)`)(location.pathname),
    predicate.toString(),
    { timeout },
  );
}

async function login(page, username, password = PASSWORD) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await waitForPath(page, (p) => !p.startsWith("/login"));
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

  // ── Dokumen: MC, rujukan, permintaan makmal ──
  await doc.click('button:has-text("Keluarkan MC")');
  await doc.waitForSelector("#fromDate", { timeout: 5000 });
  const mcFrom = await doc.inputValue("#fromDate");
  // Tiga hari cuti: hari pertama dan terakhir dikira.
  const mcTo = new Date(`${mcFrom}T00:00:00Z`);
  mcTo.setUTCDate(mcTo.getUTCDate() + 2);
  await doc.fill("#toDate", mcTo.toISOString().slice(0, 10));
  await doc.fill("#mcReason", "Demam");
  await doc.click('button:has-text("Keluarkan MC")>>nth=-1');
  await doc.waitForFunction(
    () => /MC-\d{4}-\d{5}/.test(document.querySelector("main")?.textContent ?? ""),
    null,
    { timeout: 15000 },
  );
  const withMc = await doc.textContent("main");
  const mcSerial = withMc.match(/MC-\d{4}-\d{5}/)?.[0];
  check("MC diberi nombor siri", Boolean(mcSerial), "tiada nombor siri MC");
  check("MC mengira 3 hari secara inklusif", withMc.includes("3 hari"));

  // Cetakan MC
  const mcHref = await doc.locator('a:has-text("Cetak")').first().getAttribute("href");
  const mcUrl = doc.url();
  await doc.goto(`${BASE}${mcHref}`, { waitUntil: "domcontentloaded" });
  const mcDoc = await doc.textContent("body");
  check("MC menunjukkan nama klinik", mcDoc.includes("Klinik Contoh Semenyih"));
  check("MC menunjukkan nama pesakit", mcDoc.includes(name));
  check("MC menunjukkan nombor siri", mcDoc.includes(mcSerial));
  check("MC menyatakan kedua-dua tarikh termasuk", mcDoc.includes("kedua-dua tarikh termasuk"));
  check("MC menunjukkan nombor MMC doktor", mcDoc.includes("MMC-00000"));
  await doc.goto(mcUrl, { waitUntil: "domcontentloaded" });

  // Surat rujukan mesti membawa alahan.
  await doc.click('button:has-text("Surat rujukan")');
  await doc.waitForSelector("#toFacility", { timeout: 5000 });
  await doc.fill("#toFacility", "Hospital Kajang");
  await doc.fill("#specialty", "Perubatan Am");
  await doc.fill("#referralReason", "Perlu penilaian lanjut");
  await doc.click('button:has-text("Keluarkan surat rujukan")');
  await doc.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Hospital Kajang"),
    null,
    { timeout: 15000 },
  );
  check("surat rujukan direkod", true);

  // Permintaan makmal
  await doc.click('button:has-text("Permintaan makmal")');
  await doc.waitForSelector("#tests", { timeout: 5000 });
  await doc.fill("#tests", "FBC, RP\nLFT");
  await doc.click('button:has-text("Buat permintaan")');
  await doc.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("FBC"),
    null,
    { timeout: 15000 },
  );
  const withLab = await doc.textContent("main");
  check("permintaan makmal merekod ujian", withLab.includes("FBC") && withLab.includes("LFT"));

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

  console.log("\n5. Dispensari — FEFO dan penolakan stok");
  const pharmCtx = await browser.newContext();
  const pharm = await pharmCtx.newPage();
  await login(pharm, "farmasi");

  await pharm.goto(`${BASE}/dispensari`, { waitUntil: "domcontentloaded" });
  const dispList = await pharm.textContent("main");
  check("pesakit muncul dalam baris dispensari", dispList.includes(name));

  const dispRow = pharm.locator("tr", { hasText: name });
  await Promise.all([
    pharm.waitForURL(/\/dispensari\/[^/]+$/, { timeout: 15000 }),
    dispRow.locator('a:has-text("Sediakan ubat")').click(),
  ]);
  check("skrin sediakan ubat dibuka", /\/dispensari\/[^/]+$/.test(pharm.url()), pharm.url());

  const beforeDispense = await pharm.textContent("main");
  check("amaran alahan dipaparkan kepada farmasi", beforeDispense.includes("⚠ ALAHAN"));
  check("cadangan FEFO dipaparkan", beforeDispense.includes("Cadangan FEFO"));

  // Seed memberi Paracetamol dua batch: SEED-4M (luput 4 bulan) dan
  // SEED-18M (luput 18 bulan). FEFO mesti mencadangkan yang luput dahulu.
  check(
    "FEFO mencadangkan batch luput terawal",
    beforeDispense.includes("SEED-4M"),
    "cadangan tidak menyebut SEED-4M",
  );
  check(
    "FEFO tidak mencadangkan batch luput lewat",
    !beforeDispense.includes("SEED-18M"),
    "cadangan tersilap menyebut SEED-18M",
  );

  await pharm.click('button:has-text("Sahkan & tolak stok")');
  await pharm.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Disediakan"),
    null,
    { timeout: 15000 },
  );
  const afterDispense = await pharm.textContent("main");
  check("ubat ditanda disediakan", afterDispense.includes("Disediakan"));
  check("batch yang digunakan direkod", afterDispense.includes("SEED-4M"));

  // ── Label ubat ──
  // Ikut href dan bukan klik: pautan membuka tab baharu.
  const labelHref = await pharm.locator('a:has-text("Cetak label")').first().getAttribute("href");
  await pharm.goto(`${BASE}${labelHref}`, { waitUntil: "domcontentloaded" });
  const label = await pharm.textContent("body");
  check("label menunjukkan nama pesakit", label.includes(name));
  check("label menunjukkan nama ubat", label.includes("Paracetamol 500mg"));
  check("label menunjukkan arahan BM", label.includes("4 kali sehari"));
  check("label menunjukkan kuantiti dan unit", label.includes("24 biji"));
  check("label menunjukkan batch dan tarikh luput", label.includes("SEED-4M") && label.includes("Luput"));
  check("label membawa amaran keselamatan", label.includes("Simpan jauh dari kanak-kanak"));

  // ── Lejar stok mesti menerangkan penolakan ──
  await pharm.goto(`${BASE}/inventori?cari=Paracetamol%20500`, { waitUntil: "domcontentloaded" });
  await pharm.click('a:has-text("Paracetamol 500mg")');
  await pharm.waitForURL(/\/inventori\/[^/]+$/, { timeout: 15000 });
  const ledger = await pharm.textContent("main");
  check("lejar merekod pergerakan dispense", ledger.includes("Dispense"));
  check("lejar menunjukkan kuantiti negatif", ledger.includes("-24"));

  // ── Tutup dispensari, pesakit ke kaunter bayaran ──
  await pharm.goto(`${BASE}/dispensari`, { waitUntil: "domcontentloaded" });
  const stillThere = pharm.locator("tr", { hasText: name });
  await Promise.all([
    pharm.waitForURL(/\/dispensari\/[^/]+$/, { timeout: 15000 }),
    stillThere.locator('a:has-text("Sediakan ubat")').click(),
  ]);
  await Promise.all([
    pharm.waitForURL(/\/dispensari$/, { timeout: 15000 }),
    pharm.click('button:has-text("Selesai & hantar ke kaunter")'),
  ]);
  check("dispensari selesai", /\/dispensari$/.test(pharm.url()), pharm.url());

  await pharm.goto(`${BASE}/queue`, { waitUntil: "domcontentloaded" });
  const finalBoard = await pharm.textContent("main");
  check("pesakit kini menunggu bayaran", finalBoard.includes(name));

  await pharmCtx.close();

  console.log("\n6. Kaunter bayaran");
  const cashCtx = await browser.newContext();
  const cash = await cashCtx.newPage();
  await login(cash, "kaunter");

  await cash.goto(`${BASE}/bil`, { waitUntil: "domcontentloaded" });
  const billList = await cash.textContent("main");
  check("pesakit menunggu di kaunter bayaran", billList.includes(name));

  const billRow = cash.locator("tr", { hasText: name });
  await Promise.all([
    cash.waitForURL(/\/bil\/[^/]+$/, { timeout: 15000 }),
    billRow.locator('a:has-text("Buka bil")').click(),
  ]);

  const draft = await cash.textContent("main");
  // Bil dibina automatik semasa dispensari selesai:
  // konsultasi RM25.00 + Paracetamol 24 x RM0.15 = RM3.60 → RM28.60
  check("bil memasukkan caj konsultasi", draft.includes("Konsultasi Am"));
  check("bil memasukkan ubat yang didispense", draft.includes("Paracetamol 500mg"));
  check("jumlah bil dikira betul", draft.includes("28.60"), "tiada RM 28.60 pada bil");

  await cash.click('button:has-text("Keluarkan invois")');
  await cash.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("INV-"),
    null,
    { timeout: 15000 },
  );
  const issued = await cash.textContent("main");
  check("invois diberi nombor siri", /INV-\d{4}-\d{5}/.test(issued), "tiada nombor invois");

  // Amaun lalai ialah baki penuh.
  await cash.click('button:has-text("Terima bayaran")');
  await cash.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Bayaran diterima"),
    null,
    { timeout: 15000 },
  );
  const paid = await cash.textContent("main");
  check("bayaran direkod", paid.includes("Bayaran diterima"));
  check("kaedah bayaran direkod", paid.includes("Tunai"));

  // ── Resit ──
  // Simpan URL bil: menavigasi ke resit meninggalkan halaman ini, dan
  // goBack() merentas halaman cetak tidak boleh diharap.
  const billUrl = cash.url();
  const receiptHref = await cash.locator('a:has-text("Cetak resit")').first().getAttribute("href");
  await cash.goto(`${BASE}${receiptHref}`, { waitUntil: "domcontentloaded" });
  const receipt = await cash.textContent("body");
  check("resit menunjukkan nama klinik", receipt.includes("Klinik Contoh Semenyih"));
  check("resit menunjukkan nama pesakit", receipt.includes(name));
  check("resit menunjukkan jumlah", receipt.includes("28.60"));
  check("resit menunjukkan ucapan", receipt.includes("Terima kasih"));

  await cash.goto(billUrl, { waitUntil: "domcontentloaded" });

  // ── Tutup lawatan ──
  await Promise.all([
    cash.waitForURL(/\/bil$/, { timeout: 15000 }),
    cash.click('button:has-text("Tutup lawatan")'),
  ]);
  check("lawatan ditutup", /\/bil$/.test(cash.url()), cash.url());

  // ── Tutup kaunter mesti sepadan dengan bayaran ──
  await cash.goto(`${BASE}/bil/tutup-kaunter`, { waitUntil: "domcontentloaded" });
  const closing = await cash.textContent("main");
  check("penyata tutup kaunter menyenaraikan bayaran", closing.includes(name));
  check("penyata menunjukkan kutipan tunai", closing.includes("28.60"));

  await cashCtx.close();

  console.log("\n7. Lawatan panel — pesakit tidak membayar di kaunter");
  const panelIc = testIc();
  const panelName = `Pesakit Panel ${Date.now().toString().slice(-6)}`;

  // Daftar pesakit panel (tiada ubat, jadi terus ke kaunter selepas konsultasi).
  await page.goto(`${BASE}/pendaftaran/baru`, { waitUntil: "domcontentloaded" });
  await page.fill("#idNumber", panelIc);
  await page.fill("#name", panelName);
  await page.check('input[name="consent"]');
  await Promise.all([
    page.waitForURL(/\/pendaftaran\/pesakit\//, { timeout: 15000 }),
    page.click('button:has-text("Simpan pesakit")'),
  ]);

  await page.selectOption("#payerType", "PANEL");
  await page.waitForSelector("#panelId", { timeout: 5000 });
  await page.selectOption("#panelId", { index: 1 });
  await page.fill("#employeeId", "PEK-12345");
  await Promise.all([
    page.waitForURL(/\/queue/, { timeout: 15000 }),
    page.click('button:has-text("Daftar lawatan")'),
  ]);
  check("lawatan panel didaftarkan", /\/queue/.test(page.url()), page.url());

  // Doktor: diagnosis sahaja, tiada preskripsi.
  const docCtx2 = await browser.newContext();
  const doc2 = await docCtx2.newPage();
  await login(doc2, "doktor");
  await doc2.goto(`${BASE}/konsultasi`, { waitUntil: "domcontentloaded" });
  const panelRow = doc2.locator("tr", { hasText: panelName });
  await Promise.all([
    doc2.waitForURL(/\/konsultasi\/[^/]+$/, { timeout: 15000 }),
    panelRow.locator('button:has-text("Mula rawatan")').click(),
  ]);
  await doc2.fill('input[aria-label="Cari diagnosis"]', "darah tinggi");
  await doc2.waitForSelector('button:has-text("Darah tinggi")', { timeout: 5000 });
  await doc2.click('button:has-text("Darah tinggi")');
  await doc2.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Utama"),
    null,
    { timeout: 10000 },
  );
  await Promise.all([
    doc2.waitForURL(/\/konsultasi$/, { timeout: 15000 }),
    doc2.click('button:has-text("Tutup konsultasi")'),
  ]);
  await docCtx2.close();

  // Kaunter: pesakit panel tidak membayar.
  const cashCtx2 = await browser.newContext();
  const cash2 = await cashCtx2.newPage();
  await login(cash2, "kaunter");
  await cash2.goto(`${BASE}/bil`, { waitUntil: "domcontentloaded" });
  const panelBillRow = cash2.locator("tr", { hasText: panelName });
  await Promise.all([
    cash2.waitForURL(/\/bil\/[^/]+$/, { timeout: 15000 }),
    panelBillRow.locator('a:has-text("Buka bil")').click(),
  ]);

  const panelBill = await cash2.textContent("main");
  check("bil panel menerangkan pesakit tidak membayar", panelBill.includes("tidak membayar di kaunter"));
  check("bil panel menunjukkan nama panel", panelBill.includes("PEK-12345"));

  await cash2.click('button:has-text("Keluarkan invois")');
  await cash2.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("INV-"),
    null,
    { timeout: 15000 },
  );

  const issuedPanel = await cash2.textContent("main");
  // Tiada borang bayaran untuk lawatan panel — pesakit pulang tanpa membayar.
  check("tiada borang terima bayaran untuk panel", !issuedPanel.includes("Terima bayaran"));

  await Promise.all([
    cash2.waitForURL(/\/bil$/, { timeout: 15000 }),
    cash2.click('button:has-text("Tutup lawatan")'),
  ]);
  check("lawatan panel ditutup tanpa bayaran", /\/bil$/.test(cash2.url()), cash2.url());

  // Invois panel mesti kekal tertunggak untuk dituntut kemudian.
  await cash2.goto(`${BASE}/bil/tutup-kaunter`, { waitUntil: "domcontentloaded" });
  const closing2 = await cash2.textContent("main");
  check("penyata menunjukkan invois panel tertunggak", closing2.includes("Tertunggak"));

  await cashCtx2.close();

  console.log("\n8. Tuntutan panel");
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, "admin");

  await admin.goto(`${BASE}/panel`, { waitUntil: "domcontentloaded" });
  const panelHome = await admin.textContent("main");
  // Kad "Belum dituntut" mesti mengira invois panel daripada langkah 7.
  // Jangan uji "RM 0.00" — kad "Tuntutan tertunggak" sah bernilai sifar.
  check(
    "papan panel mengira invois belum dituntut",
    !panelHome.includes("0 invois panel belum dimasukkan"),
    "kad menunjukkan sifar invois belum dituntut",
  );

  // Tempoh mesti merangkumi hari ini — invois panel dikeluarkan sebentar tadi.
  const todayIso = new Date().toISOString().slice(0, 10);
  await admin.selectOption("#panelId", { index: 1 });
  await admin.fill("#periodStart", todayIso);
  await admin.fill("#periodEnd", todayIso);
  await Promise.all([
    admin.waitForURL(/\/panel\/[^/]+$/, { timeout: 15000 }),
    admin.click('button:has-text("Bina tuntutan")'),
  ]);
  check("tuntutan dibina", /\/panel\/[^/]+$/.test(admin.url()), admin.url());

  const claimUrl = admin.url();
  const claimPage = await admin.textContent("main");
  check("tuntutan diberi nombor siri", /TP-\d{4}-\d{5}/.test(claimPage), "tiada nombor tuntutan");
  check("tuntutan mengandungi pesakit panel", claimPage.includes(panelName));
  check("tuntutan menunjukkan no. ahli", claimPage.includes("PEK-12345"));

  // ── CSV untuk key-in ke portal TPA ──
  const csvResponse = await admin.request.get(`${claimUrl}/csv`);
  check("CSV boleh dimuat turun", csvResponse.ok(), `status ${csvResponse.status()}`);
  const csvText = await csvResponse.text();
  check("CSV mengandungi tajuk lajur", csvText.includes("No. Invois") && csvText.includes("No. Ahli"));
  check("CSV mengandungi pesakit panel", csvText.includes(panelName));
  check("CSV mengandungi no. ahli", csvText.includes("PEK-12345"));
  check(
    "CSV bermula dengan BOM untuk Excel",
    csvText.charCodeAt(0) === 0xfeff,
    "tiada BOM",
  );

  // ── Hantar dan bayar ──
  await admin.click('button:has-text("Tandakan telah dihantar")');
  await admin.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Rekod bayaran panel"),
    null,
    { timeout: 15000 },
  );
  check("tuntutan ditanda dihantar", true);

  await admin.click('button:has-text("Rekod bayaran panel")');
  await admin.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("dibayar sepenuhnya"),
    null,
    { timeout: 15000 },
  );
  const paidClaim = await admin.textContent("main");
  check("tuntutan ditanda dibayar", paidClaim.includes("dibayar sepenuhnya"));

  // ── Tuntutan berganda mesti mustahil ──
  await admin.goto(`${BASE}/panel`, { waitUntil: "domcontentloaded" });
  await admin.selectOption("#panelId", { index: 1 });
  await admin.fill("#periodStart", todayIso);
  await admin.fill("#periodEnd", todayIso);
  await admin.click('button:has-text("Bina tuntutan")');
  // Padankan teks kandungan utama, bukan elemen [role="alert"] pertama:
  // halaman membawa lebih daripada satu nod peranan alert dan susunannya
  // tidak dijamin.
  await admin.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("belum dituntut dalam tempoh ini"),
    null,
    { timeout: 15000 },
  );
  check("invois yang sudah dituntut tidak boleh dituntut semula", true);
  check(
    "kekal pada halaman panel dan bukan mencipta tuntutan kosong",
    /\/panel$/.test(admin.url()),
    admin.url(),
  );

  console.log("\n9. Laporan");
  await admin.goto(`${BASE}/laporan`, { waitUntil: "domcontentloaded" });
  const reports = await admin.textContent("main");
  // Bayaran tunai RM28.60 daripada langkah 6 mesti muncul dalam kutipan.
  check("laporan menunjukkan kutipan tunai", reports.includes("Tunai"));
  check("laporan menunjukkan diagnosis teratas", reports.includes("Demam"));
  check("laporan menunjukkan penggunaan ubat", reports.includes("Paracetamol 500mg"));
  check("laporan menunjukkan produktiviti doktor", reports.includes("Dr. Contoh"));

  // Bayaran panel direkod sebagai kaedah PANEL, bukan tunai — jika tidak
  // penyata tutup kaunter akan tersalah kira wang dalam laci.
  check("bayaran panel diasingkan daripada tunai", reports.includes("Panel"));

  console.log("\n10. Tetapan — kata laluan dan formulari");

  // ── Cipta pengguna, kemudian tukar kata laluannya sendiri ──
  const staffUser = `ujian${Date.now().toString().slice(-8)}`;
  const staffPass = "kata-laluan-ujian-1";
  const staffNewPass = "kata-laluan-ujian-2";

  await admin.goto(`${BASE}/tetapan/pengguna`, { waitUntil: "domcontentloaded" });
  await admin.fill("#username", staffUser);
  await admin.fill("#name", "Kakitangan Ujian");
  await admin.selectOption("#role", "FRONTDESK");
  await admin.fill("#password", staffPass);
  await admin.click('button:has-text("Cipta pengguna")');
  await admin.waitForFunction(
    (u) => document.querySelector("main")?.textContent?.includes(u),
    staffUser,
    { timeout: 15000 },
  );
  check("pengguna baharu dicipta", true);

  const staffCtx = await browser.newContext();
  const staff = await staffCtx.newPage();
  await login(staff, staffUser, staffPass);
  check("pengguna baharu boleh log masuk", new URL(staff.url()).pathname === "/", staff.url());

  await staff.goto(`${BASE}/akaun`, { waitUntil: "domcontentloaded" });
  await staff.fill("#currentPassword", staffPass);
  await staff.fill("#newPassword", staffNewPass);
  await staff.fill("#confirmPassword", staffNewPass);
  await staff.click('button:has-text("Tukar kata laluan")');
  await staff.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("Kata laluan ditukar"),
    null,
    { timeout: 15000 },
  );
  check("kata laluan sendiri boleh ditukar", true);

  // Kata laluan lama mesti berhenti berfungsi, yang baharu mesti berfungsi.
  const recheckCtx = await browser.newContext();
  const recheck = await recheckCtx.newPage();
  // Tunggu hydration selesai sebelum menghantar.
  //
  // Sebelum React memasang, borang dihantar sebagai POST pelayar biasa dan
  // halaman dimuat semula sepenuhnya, yang mengosongkan setiap medan. Itu
  // kelakuan peningkatan progresif yang betul, tetapi ia bukan yang dialami
  // pengguna sebenar, jadi ujian ini menunggu keadaan yang sama seperti mereka.
  await recheck.goto(`${BASE}/login`, { waitUntil: "load" });
  await recheck.waitForLoadState("networkidle");
  await recheck.fill("#username", staffUser);
  await recheck.fill("#password", staffPass);
  await recheck.click('button[type="submit"]');
  await recheck.waitForSelector('[role="alert"]', { timeout: 15000 });
  check(
    "kata laluan lama ditolak selepas ditukar",
    new URL(recheck.url()).pathname === "/login",
    recheck.url(),
  );

  // Nama pengguna mesti kekal selepas cubaan gagal — kakitangan tidak
  // sepatutnya menaip semula kedua-dua medan.
  check(
    "nama pengguna kekal selepas log masuk gagal",
    (await recheck.inputValue("#username")) === staffUser,
    "medan nama pengguna dikosongkan",
  );

  // React menetapkan semula medan tidak terkawal selepas tindakan borang
  // selesai. Tunggu penetapan semula itu berlaku sebelum menaip semula, jika
  // tidak kata laluan akan dipadam antara isian dan klik.
  await recheck.waitForFunction(
    () => document.querySelector("#password")?.value === "",
    null,
    { timeout: 10000 },
  );
  await recheck.fill("#password", staffNewPass);
  await recheck.click('button[type="submit"]');
  await waitForPath(recheck, (p) => !p.startsWith("/login"));
  check("kata laluan baharu diterima", new URL(recheck.url()).pathname === "/", recheck.url());
  await recheckCtx.close();
  await staffCtx.close();

  // ── Harga formulari hanya mempengaruhi preskripsi baharu ──
  await admin.goto(`${BASE}/tetapan/formulari?cari=Paracetamol%20500`, {
    waitUntil: "domcontentloaded",
  });
  const beforePrice = await admin.textContent("main");
  check("formulari menunjukkan harga semasa", beforePrice.includes("RM 0.15"));

  await admin.click('button:has-text("Sunting")');
  await admin.waitForSelector('input[name="sellPrice"]', { timeout: 5000 });
  await admin.fill('input[name="sellPrice"]', "0.20");
  await admin.click('button:has-text("Simpan")');
  await admin.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("dikemas kini"),
    null,
    { timeout: 15000 },
  );
  await admin.goto(`${BASE}/tetapan/formulari?cari=Paracetamol%20500`, {
    waitUntil: "domcontentloaded",
  });
  const afterPrice = await admin.textContent("main");
  check("harga formulari dikemas kini", afterPrice.includes("RM 0.20"));

  // Invois yang lalu mesti KEKAL pada harga asalnya.
  await admin.goto(`${BASE}${receiptHref}`, { waitUntil: "domcontentloaded" });
  const oldReceipt = await admin.textContent("body");
  check(
    "invois lalu tidak berubah bila harga formulari berubah",
    oldReceipt.includes("28.60"),
    "jumlah resit lama berubah",
  );

  // Pulihkan harga supaya ujian ini boleh dijalankan berulang kali.
  await admin.goto(`${BASE}/tetapan/formulari?cari=Paracetamol%20500`, {
    waitUntil: "domcontentloaded",
  });
  await admin.click('button:has-text("Sunting")');
  await admin.waitForSelector('input[name="sellPrice"]', { timeout: 5000 });
  await admin.fill('input[name="sellPrice"]', "0.15");
  await admin.click('button:has-text("Simpan")');
  await admin.waitForFunction(
    () => document.querySelector("main")?.textContent?.includes("dikemas kini"),
    null,
    { timeout: 15000 },
  );
  check("harga dipulihkan untuk larian seterusnya", true);

  await adminCtx.close();
} finally {
  await ctx.close();
  await browser.close();
}

console.log(failures === 0 ? "\nSemua pemeriksaan lulus." : `\n${failures} pemeriksaan gagal.`);
process.exit(failures === 0 ? 0 : 1);
