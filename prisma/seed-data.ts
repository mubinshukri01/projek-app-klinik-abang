/**
 * Data benih untuk pembangunan dan persediaan klinik baharu.
 *
 * ⚠️  AMARAN KLINIKAL
 * Senarai ubat, dos lalai dan harga di bawah adalah CONTOH untuk menjalankan
 * sistem. Doktor yang bertanggungjawab MESTI menyemak dan mengesahkan setiap
 * baris melalui skrin Tetapan → Formulari sebelum digunakan pada pesakit sebenar.
 */

import type { DrugForm, PanelType, ServiceCategory } from "@/generated/prisma/enums";

export interface SeedDrug {
  name: string;
  genericName?: string;
  strength?: string;
  form: DrugForm;
  unit: string;
  defaultDose: string;
  defaultFrequency: string;
  defaultDuration: number;
  instructionsMs: string;
  instructionsEn: string;
  sellPrice: number;
  reorderLevel: number;
  isControlled?: boolean;
}

const SELEPAS_MAKAN = "Ambil selepas makan";
const SELEPAS_MAKAN_EN = "Take after food";

export const DRUGS: SeedDrug[] = [
  // ── Analgesik / antipiretik ──
  { name: "Paracetamol 500mg", genericName: "Paracetamol", strength: "500mg", form: "TABLET", unit: "biji", defaultDose: "1-2", defaultFrequency: "4 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1-2 biji, 4 kali sehari bila demam atau sakit", instructionsEn: "Take 1-2 tablets, 4 times a day when fever or pain", sellPrice: 0.15, reorderLevel: 500 },
  { name: "Paracetamol Sirap 120mg/5ml", genericName: "Paracetamol", strength: "120mg/5ml", form: "SIRAP", unit: "botol", defaultDose: "5ml", defaultFrequency: "4 kali sehari", defaultDuration: 3, instructionsMs: "Beri 5ml, 4 kali sehari bila demam", instructionsEn: "Give 5ml, 4 times a day when fever", sellPrice: 8.0, reorderLevel: 20 },
  { name: "Ibuprofen 400mg", genericName: "Ibuprofen", strength: "400mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: `Ambil 1 biji, 3 kali sehari ${SELEPAS_MAKAN.toLowerCase()}`, instructionsEn: `Take 1 tablet, 3 times a day ${SELEPAS_MAKAN_EN.toLowerCase()}`, sellPrice: 0.3, reorderLevel: 300 },
  { name: "Ibuprofen Sirap 100mg/5ml", genericName: "Ibuprofen", strength: "100mg/5ml", form: "SIRAP", unit: "botol", defaultDose: "5ml", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Beri 5ml, 3 kali sehari selepas makan", instructionsEn: "Give 5ml, 3 times a day after food", sellPrice: 9.0, reorderLevel: 15 },
  { name: "Mefenamic Acid 500mg", genericName: "Mefenamic Acid", strength: "500mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 3 kali sehari selepas makan", instructionsEn: "Take 1 capsule, 3 times a day after food", sellPrice: 0.35, reorderLevel: 200 },
  { name: "Diclofenac Sodium 50mg", genericName: "Diclofenac", strength: "50mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan", instructionsEn: "Take 1 tablet, 2 times a day after food", sellPrice: 0.3, reorderLevel: 200 },
  { name: "Naproxen 250mg", genericName: "Naproxen", strength: "250mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan", instructionsEn: "Take 1 tablet, 2 times a day after food", sellPrice: 0.4, reorderLevel: 100 },
  { name: "Aspirin 100mg", genericName: "Acetylsalicylic Acid", strength: "100mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji, sekali sehari selepas makan", instructionsEn: "Take 1 tablet once daily after food", sellPrice: 0.15, reorderLevel: 200 },
  { name: "Tramadol 50mg", genericName: "Tramadol", strength: "50mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 2 kali sehari bila sakit teruk", instructionsEn: "Take 1 capsule, 2 times a day for severe pain", sellPrice: 0.8, reorderLevel: 50, isControlled: true },

  // ── Antibiotik ──
  { name: "Amoxicillin 500mg", genericName: "Amoxicillin", strength: "500mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 3 kali sehari. HABISKAN semua ubat.", instructionsEn: "Take 1 capsule, 3 times a day. COMPLETE the full course.", sellPrice: 0.5, reorderLevel: 300 },
  { name: "Amoxicillin Sirap 125mg/5ml", genericName: "Amoxicillin", strength: "125mg/5ml", form: "SIRAP", unit: "botol", defaultDose: "5ml", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Beri 5ml, 3 kali sehari. HABISKAN semua ubat.", instructionsEn: "Give 5ml, 3 times a day. COMPLETE the full course.", sellPrice: 12.0, reorderLevel: 20 },
  { name: "Co-Amoxiclav 625mg", genericName: "Amoxicillin + Clavulanic Acid", strength: "625mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan. HABISKAN semua ubat.", instructionsEn: "Take 1 tablet, 2 times a day after food. COMPLETE the course.", sellPrice: 2.5, reorderLevel: 100 },
  { name: "Cloxacillin 500mg", genericName: "Cloxacillin", strength: "500mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "4 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 4 kali sehari sebelum makan. HABISKAN semua ubat.", instructionsEn: "Take 1 capsule, 4 times a day before food. COMPLETE the course.", sellPrice: 0.6, reorderLevel: 150 },
  { name: "Cephalexin 500mg", genericName: "Cephalexin", strength: "500mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 3 kali sehari. HABISKAN semua ubat.", instructionsEn: "Take 1 capsule, 3 times a day. COMPLETE the course.", sellPrice: 0.7, reorderLevel: 150 },
  { name: "Cefuroxime 250mg", genericName: "Cefuroxime", strength: "250mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan. HABISKAN semua ubat.", instructionsEn: "Take 1 tablet, 2 times a day after food. COMPLETE the course.", sellPrice: 2.0, reorderLevel: 100 },
  { name: "Erythromycin 250mg", genericName: "Erythromycin", strength: "250mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "4 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 4 kali sehari. HABISKAN semua ubat.", instructionsEn: "Take 1 tablet, 4 times a day. COMPLETE the course.", sellPrice: 0.5, reorderLevel: 100 },
  { name: "Azithromycin 250mg", genericName: "Azithromycin", strength: "250mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, sekali sehari selama 3 hari.", instructionsEn: "Take 1 tablet once daily for 3 days.", sellPrice: 3.0, reorderLevel: 60 },
  { name: "Doxycycline 100mg", genericName: "Doxycycline", strength: "100mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 7, instructionsMs: "Ambil 1 biji, 2 kali sehari dengan air penuh. Jangan baring selepas ambil.", instructionsEn: "Take 1 capsule, 2 times a day with a full glass of water. Do not lie down after.", sellPrice: 0.4, reorderLevel: 100 },
  { name: "Metronidazole 400mg", genericName: "Metronidazole", strength: "400mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 3 kali sehari selepas makan. JANGAN minum alkohol.", instructionsEn: "Take 1 tablet, 3 times a day after food. AVOID alcohol.", sellPrice: 0.3, reorderLevel: 150 },
  { name: "Ciprofloxacin 500mg", genericName: "Ciprofloxacin", strength: "500mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 2 kali sehari. HABISKAN semua ubat.", instructionsEn: "Take 1 tablet, 2 times a day. COMPLETE the course.", sellPrice: 0.9, reorderLevel: 80 },
  { name: "Co-Trimoxazole 480mg", genericName: "Trimethoprim + Sulfamethoxazole", strength: "480mg", form: "TABLET", unit: "biji", defaultDose: "2", defaultFrequency: "2 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 2 biji, 2 kali sehari selepas makan.", instructionsEn: "Take 2 tablets, 2 times a day after food.", sellPrice: 0.25, reorderLevel: 100 },

  // ── Antihistamin ──
  { name: "Chlorpheniramine 4mg", genericName: "Chlorpheniramine Maleate", strength: "4mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 3 kali sehari. Boleh menyebabkan mengantuk.", instructionsEn: "Take 1 tablet, 3 times a day. May cause drowsiness.", sellPrice: 0.1, reorderLevel: 300 },
  { name: "Loratadine 10mg", genericName: "Loratadine", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, sekali sehari.", instructionsEn: "Take 1 tablet once daily.", sellPrice: 0.35, reorderLevel: 150 },
  { name: "Cetirizine 10mg", genericName: "Cetirizine", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji pada waktu malam.", instructionsEn: "Take 1 tablet at night.", sellPrice: 0.3, reorderLevel: 200 },
  { name: "Cetirizine Sirap 5mg/5ml", genericName: "Cetirizine", strength: "5mg/5ml", form: "SIRAP", unit: "botol", defaultDose: "5ml", defaultFrequency: "1 kali sehari", defaultDuration: 5, instructionsMs: "Beri 5ml pada waktu malam.", instructionsEn: "Give 5ml at night.", sellPrice: 10.0, reorderLevel: 15 },

  // ── Batuk & selesema ──
  { name: "Dextromethorphan Sirap", genericName: "Dextromethorphan", strength: "15mg/5ml", form: "SIRAP", unit: "botol", defaultDose: "10ml", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 10ml, 3 kali sehari untuk batuk kering.", instructionsEn: "Take 10ml, 3 times a day for dry cough.", sellPrice: 9.0, reorderLevel: 20 },
  { name: "Bromhexine 8mg", genericName: "Bromhexine", strength: "8mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 1 biji, 3 kali sehari untuk cairkan kahak.", instructionsEn: "Take 1 tablet, 3 times a day to loosen phlegm.", sellPrice: 0.2, reorderLevel: 200 },
  { name: "Guaifenesin Sirap", genericName: "Guaifenesin", strength: "100mg/5ml", form: "SIRAP", unit: "botol", defaultDose: "10ml", defaultFrequency: "3 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 10ml, 3 kali sehari untuk batuk berkahak.", instructionsEn: "Take 10ml, 3 times a day for productive cough.", sellPrice: 8.5, reorderLevel: 20 },
  { name: "Pseudoephedrine 60mg", genericName: "Pseudoephedrine", strength: "60mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 3 kali sehari untuk hidung tersumbat.", instructionsEn: "Take 1 tablet, 3 times a day for nasal congestion.", sellPrice: 0.3, reorderLevel: 100 },
  { name: "Salbutamol Inhaler 100mcg", genericName: "Salbutamol", strength: "100mcg", form: "SEMBUR", unit: "tiub", defaultDose: "2 sedutan", defaultFrequency: "bila perlu", defaultDuration: 30, instructionsMs: "Sedut 2 kali bila sesak nafas. Kumur mulut selepas guna.", instructionsEn: "Inhale 2 puffs when short of breath. Rinse mouth after use.", sellPrice: 18.0, reorderLevel: 10 },
  { name: "Salbutamol Nebule 2.5mg", genericName: "Salbutamol", strength: "2.5mg/2.5ml", form: "LAIN", unit: "ampul", defaultDose: "1 ampul", defaultFrequency: "bila perlu", defaultDuration: 1, instructionsMs: "Untuk kegunaan nebulizer di klinik.", instructionsEn: "For nebuliser use in clinic.", sellPrice: 4.0, reorderLevel: 30 },
  { name: "Montelukast 10mg", genericName: "Montelukast", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu malam.", instructionsEn: "Take 1 tablet at night.", sellPrice: 1.5, reorderLevel: 60 },

  // ── Gastrousus ──
  { name: "Omeprazole 20mg", genericName: "Omeprazole", strength: "20mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 14, instructionsMs: "Ambil 1 biji sebelum sarapan.", instructionsEn: "Take 1 capsule before breakfast.", sellPrice: 0.5, reorderLevel: 200 },
  { name: "Ranitidine 150mg", genericName: "Ranitidine", strength: "150mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 7, instructionsMs: "Ambil 1 biji, 2 kali sehari.", instructionsEn: "Take 1 tablet, 2 times a day.", sellPrice: 0.25, reorderLevel: 150 },
  { name: "Antacid Suspension", genericName: "Magnesium + Aluminium Hydroxide", form: "SIRAP", unit: "botol", defaultDose: "10ml", defaultFrequency: "3 kali sehari", defaultDuration: 7, instructionsMs: "Ambil 10ml, 3 kali sehari selepas makan.", instructionsEn: "Take 10ml, 3 times a day after food.", sellPrice: 7.5, reorderLevel: 20 },
  { name: "Domperidone 10mg", genericName: "Domperidone", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 3 kali sehari sebelum makan.", instructionsEn: "Take 1 tablet, 3 times a day before food.", sellPrice: 0.3, reorderLevel: 150 },
  { name: "Metoclopramide 10mg", genericName: "Metoclopramide", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 3 kali sehari sebelum makan.", instructionsEn: "Take 1 tablet, 3 times a day before food.", sellPrice: 0.25, reorderLevel: 100 },
  { name: "Hyoscine Butylbromide 10mg", genericName: "Hyoscine Butylbromide", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "3 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 3 kali sehari bila sakit perut memulas.", instructionsEn: "Take 1 tablet, 3 times a day for abdominal cramps.", sellPrice: 0.4, reorderLevel: 100 },
  { name: "Loperamide 2mg", genericName: "Loperamide", strength: "2mg", form: "KAPSUL", unit: "biji", defaultDose: "1", defaultFrequency: "bila perlu", defaultDuration: 2, instructionsMs: "Ambil 1 biji selepas setiap kali cirit-birit. Maksimum 4 biji sehari.", instructionsEn: "Take 1 capsule after each loose stool. Maximum 4 per day.", sellPrice: 0.3, reorderLevel: 100 },
  { name: "Garam Rehidrasi Oral (ORS)", genericName: "Oral Rehydration Salts", form: "LAIN", unit: "paket", defaultDose: "1 paket", defaultFrequency: "bila perlu", defaultDuration: 3, instructionsMs: "Larutkan 1 paket dalam 1 liter air masak. Minum sedikit-sedikit kerap.", instructionsEn: "Dissolve 1 sachet in 1 litre of boiled water. Sip frequently.", sellPrice: 1.5, reorderLevel: 100 },
  { name: "Lactulose Sirap", genericName: "Lactulose", form: "SIRAP", unit: "botol", defaultDose: "15ml", defaultFrequency: "1 kali sehari", defaultDuration: 7, instructionsMs: "Ambil 15ml pada waktu malam untuk sembelit.", instructionsEn: "Take 15ml at night for constipation.", sellPrice: 14.0, reorderLevel: 10 },
  { name: "Bisacodyl 5mg", genericName: "Bisacodyl", strength: "5mg", form: "TABLET", unit: "biji", defaultDose: "1-2", defaultFrequency: "1 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1-2 biji pada waktu malam. Jangan kunyah.", instructionsEn: "Take 1-2 tablets at night. Do not chew.", sellPrice: 0.2, reorderLevel: 100 },

  // ── Kardiovaskular & metabolik ──
  { name: "Amlodipine 5mg", genericName: "Amlodipine", strength: "5mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu pagi. Untuk tekanan darah tinggi.", instructionsEn: "Take 1 tablet in the morning. For high blood pressure.", sellPrice: 0.2, reorderLevel: 300 },
  { name: "Amlodipine 10mg", genericName: "Amlodipine", strength: "10mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu pagi. Untuk tekanan darah tinggi.", instructionsEn: "Take 1 tablet in the morning. For high blood pressure.", sellPrice: 0.3, reorderLevel: 200 },
  { name: "Perindopril 4mg", genericName: "Perindopril", strength: "4mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu pagi sebelum makan.", instructionsEn: "Take 1 tablet in the morning before food.", sellPrice: 0.6, reorderLevel: 150 },
  { name: "Losartan 50mg", genericName: "Losartan", strength: "50mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sekali sehari.", instructionsEn: "Take 1 tablet once daily.", sellPrice: 0.5, reorderLevel: 150 },
  { name: "Metoprolol 50mg", genericName: "Metoprolol", strength: "50mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan.", instructionsEn: "Take 1 tablet, 2 times a day after food.", sellPrice: 0.3, reorderLevel: 100 },
  { name: "Atenolol 50mg", genericName: "Atenolol", strength: "50mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sekali sehari.", instructionsEn: "Take 1 tablet once daily.", sellPrice: 0.2, reorderLevel: 100 },
  { name: "Hydrochlorothiazide 25mg", genericName: "Hydrochlorothiazide", strength: "25mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu pagi. Akan kerap kencing.", instructionsEn: "Take 1 tablet in the morning. Will increase urination.", sellPrice: 0.15, reorderLevel: 100 },
  { name: "Simvastatin 20mg", genericName: "Simvastatin", strength: "20mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu malam. Untuk kolesterol.", instructionsEn: "Take 1 tablet at night. For cholesterol.", sellPrice: 0.3, reorderLevel: 200 },
  { name: "Atorvastatin 20mg", genericName: "Atorvastatin", strength: "20mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji pada waktu malam. Untuk kolesterol.", instructionsEn: "Take 1 tablet at night. For cholesterol.", sellPrice: 0.5, reorderLevel: 150 },
  { name: "Metformin 500mg", genericName: "Metformin", strength: "500mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan. Untuk kencing manis.", instructionsEn: "Take 1 tablet, 2 times a day after food. For diabetes.", sellPrice: 0.15, reorderLevel: 400 },
  { name: "Metformin 850mg", genericName: "Metformin", strength: "850mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan.", instructionsEn: "Take 1 tablet, 2 times a day after food.", sellPrice: 0.2, reorderLevel: 200 },
  { name: "Gliclazide 80mg", genericName: "Gliclazide", strength: "80mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sebelum sarapan.", instructionsEn: "Take 1 tablet before breakfast.", sellPrice: 0.3, reorderLevel: 150 },
  { name: "Glibenclamide 5mg", genericName: "Glibenclamide", strength: "5mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sebelum sarapan.", instructionsEn: "Take 1 tablet before breakfast.", sellPrice: 0.15, reorderLevel: 100 },

  // ── Gout ──
  { name: "Allopurinol 100mg", genericName: "Allopurinol", strength: "100mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji selepas makan. Minum banyak air.", instructionsEn: "Take 1 tablet after food. Drink plenty of water.", sellPrice: 0.2, reorderLevel: 100 },
  { name: "Colchicine 0.5mg", genericName: "Colchicine", strength: "0.5mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 3, instructionsMs: "Ambil 1 biji, 2 kali sehari. Berhenti jika cirit-birit.", instructionsEn: "Take 1 tablet, 2 times a day. Stop if diarrhoea occurs.", sellPrice: 0.6, reorderLevel: 60 },

  // ── Steroid & krim ──
  { name: "Prednisolone 5mg", genericName: "Prednisolone", strength: "5mg", form: "TABLET", unit: "biji", defaultDose: "2", defaultFrequency: "1 kali sehari", defaultDuration: 5, instructionsMs: "Ambil 2 biji pada waktu pagi selepas makan.", instructionsEn: "Take 2 tablets in the morning after food.", sellPrice: 0.15, reorderLevel: 100 },
  { name: "Hydrocortisone Krim 1%", genericName: "Hydrocortisone", strength: "1%", form: "KRIM", unit: "tiub", defaultDose: "sapu nipis", defaultFrequency: "2 kali sehari", defaultDuration: 7, instructionsMs: "Sapu nipis pada tempat yang gatal, 2 kali sehari.", instructionsEn: "Apply thinly to affected area, 2 times a day.", sellPrice: 6.0, reorderLevel: 20 },
  { name: "Betamethasone Krim 0.1%", genericName: "Betamethasone", strength: "0.1%", form: "KRIM", unit: "tiub", defaultDose: "sapu nipis", defaultFrequency: "2 kali sehari", defaultDuration: 7, instructionsMs: "Sapu nipis pada tempat yang terjejas, 2 kali sehari.", instructionsEn: "Apply thinly to affected area, 2 times a day.", sellPrice: 8.0, reorderLevel: 20 },
  { name: "Clotrimazole Krim 1%", genericName: "Clotrimazole", strength: "1%", form: "KRIM", unit: "tiub", defaultDose: "sapu nipis", defaultFrequency: "2 kali sehari", defaultDuration: 14, instructionsMs: "Sapu pada tempat berkulat, 2 kali sehari selama 2 minggu.", instructionsEn: "Apply to fungal area, 2 times a day for 2 weeks.", sellPrice: 7.0, reorderLevel: 20 },
  { name: "Fusidic Acid Krim 2%", genericName: "Fusidic Acid", strength: "2%", form: "KRIM", unit: "tiub", defaultDose: "sapu nipis", defaultFrequency: "3 kali sehari", defaultDuration: 7, instructionsMs: "Sapu pada luka, 3 kali sehari.", instructionsEn: "Apply to wound, 3 times a day.", sellPrice: 12.0, reorderLevel: 15 },
  { name: "Calamine Losyen", genericName: "Calamine", form: "LAIN", unit: "botol", defaultDose: "sapu", defaultFrequency: "bila perlu", defaultDuration: 7, instructionsMs: "Sapu pada tempat gatal bila perlu.", instructionsEn: "Apply to itchy area as needed.", sellPrice: 6.0, reorderLevel: 15 },
  { name: "Povidone Iodine 10%", genericName: "Povidone Iodine", strength: "10%", form: "LAIN", unit: "botol", defaultDose: "sapu", defaultFrequency: "bila perlu", defaultDuration: 7, instructionsMs: "Sapu pada luka untuk mencuci.", instructionsEn: "Apply to wound for cleaning.", sellPrice: 8.0, reorderLevel: 20 },
  { name: "Silver Sulfadiazine Krim 1%", genericName: "Silver Sulfadiazine", strength: "1%", form: "KRIM", unit: "tiub", defaultDose: "sapu tebal", defaultFrequency: "1 kali sehari", defaultDuration: 7, instructionsMs: "Sapu tebal pada luka melecur, sekali sehari.", instructionsEn: "Apply thickly to burn, once daily.", sellPrice: 15.0, reorderLevel: 10 },

  // ── Mata & telinga ──
  { name: "Chloramphenicol Titis Mata 0.5%", genericName: "Chloramphenicol", strength: "0.5%", form: "TITIS", unit: "botol", defaultDose: "1 titis", defaultFrequency: "4 kali sehari", defaultDuration: 5, instructionsMs: "Titis 1 titis pada mata yang terjejas, 4 kali sehari. Buang 1 bulan selepas dibuka.", instructionsEn: "Instil 1 drop into affected eye, 4 times a day. Discard 1 month after opening.", sellPrice: 9.0, reorderLevel: 15 },
  { name: "Gentamicin Titis Mata 0.3%", genericName: "Gentamicin", strength: "0.3%", form: "TITIS", unit: "botol", defaultDose: "1 titis", defaultFrequency: "4 kali sehari", defaultDuration: 5, instructionsMs: "Titis 1 titis pada mata yang terjejas, 4 kali sehari.", instructionsEn: "Instil 1 drop into affected eye, 4 times a day.", sellPrice: 9.5, reorderLevel: 10 },
  { name: "Titis Mata Sodium Chloride 0.9%", genericName: "Sodium Chloride", strength: "0.9%", form: "TITIS", unit: "botol", defaultDose: "1-2 titis", defaultFrequency: "bila perlu", defaultDuration: 7, instructionsMs: "Titis 1-2 titis bila mata kering atau berhabuk.", instructionsEn: "Instil 1-2 drops when eyes are dry or irritated.", sellPrice: 7.0, reorderLevel: 15 },

  // ── Vitamin & suplemen ──
  { name: "Vitamin B Kompleks", genericName: "Vitamin B Complex", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sehari selepas makan.", instructionsEn: "Take 1 tablet daily after food.", sellPrice: 0.1, reorderLevel: 300 },
  { name: "Asid Folik 5mg", genericName: "Folic Acid", strength: "5mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sehari.", instructionsEn: "Take 1 tablet daily.", sellPrice: 0.1, reorderLevel: 200 },
  { name: "Ferrous Fumarate 200mg", genericName: "Ferrous Fumarate", strength: "200mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "2 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji, 2 kali sehari selepas makan. Najis mungkin jadi hitam.", instructionsEn: "Take 1 tablet, 2 times a day after food. Stools may turn black.", sellPrice: 0.15, reorderLevel: 200 },
  { name: "Kalsium Karbonat 500mg", genericName: "Calcium Carbonate", strength: "500mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sehari selepas makan.", instructionsEn: "Take 1 tablet daily after food.", sellPrice: 0.15, reorderLevel: 150 },
  { name: "Vitamin C 100mg", genericName: "Ascorbic Acid", strength: "100mg", form: "TABLET", unit: "biji", defaultDose: "1", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Ambil 1 biji sehari.", instructionsEn: "Take 1 tablet daily.", sellPrice: 0.1, reorderLevel: 300 },
  { name: "Multivitamin Sirap Kanak-kanak", genericName: "Multivitamin", form: "SIRAP", unit: "botol", defaultDose: "5ml", defaultFrequency: "1 kali sehari", defaultDuration: 30, instructionsMs: "Beri 5ml sehari.", instructionsEn: "Give 5ml daily.", sellPrice: 12.0, reorderLevel: 10 },
];

export interface SeedService {
  code: string;
  name: string;
  category: ServiceCategory;
  price: number;
}

export const SERVICES: SeedService[] = [
  { code: "KON-AM", name: "Konsultasi Am", category: "KONSULTASI", price: 25.0 },
  { code: "KON-ULANG", name: "Konsultasi Ulangan", category: "KONSULTASI", price: 20.0 },
  { code: "KON-LUAR", name: "Konsultasi Selepas Waktu", category: "KONSULTASI", price: 40.0 },
  { code: "LUKA-K", name: "Rawatan Luka Kecil", category: "PROSEDUR", price: 30.0 },
  { code: "LUKA-B", name: "Rawatan Luka Besar", category: "PROSEDUR", price: 60.0 },
  { code: "JAHIT", name: "Jahitan Luka", category: "PROSEDUR", price: 80.0 },
  { code: "BUANG-JAHIT", name: "Buang Jahitan", category: "PROSEDUR", price: 25.0 },
  { code: "NEB", name: "Rawatan Nebulizer", category: "PROSEDUR", price: 25.0 },
  { code: "SUNTIK-IM", name: "Suntikan Intramuskular", category: "SUNTIKAN", price: 15.0 },
  { code: "SUNTIK-ATT", name: "Suntikan Anti-Tetanus", category: "SUNTIKAN", price: 35.0 },
  { code: "UJI-GLU", name: "Ujian Gula Darah", category: "UJIAN", price: 10.0 },
  { code: "UJI-URIN", name: "Ujian Air Kencing", category: "UJIAN", price: 15.0 },
  { code: "UJI-HAMIL", name: "Ujian Kehamilan", category: "UJIAN", price: 15.0 },
  { code: "ECG", name: "Rakaman ECG", category: "UJIAN", price: 50.0 },
  { code: "MC", name: "Sijil Cuti Sakit", category: "LAIN", price: 5.0 },
  { code: "SURAT-RUJUK", name: "Surat Rujukan", category: "LAIN", price: 10.0 },
];

export interface SeedPanel {
  name: string;
  type: PanelType;
  billingCycle: string;
  notes: string;
}

/**
 * Panel korporat dan TPA sahaja.
 *
 * Skim MADANI dan PeKa B40 TIDAK disenaraikan di sini — kedua-duanya dikendali
 * melalui Visit.payerType, dan tuntutannya dihantar melalui portal PRIMIS
 * ProtectHealth, bukan dari sistem ini.
 */
export const PANELS: SeedPanel[] = [
  { name: "PMCare", type: "TPA", billingCycle: "Bulanan", notes: "Tuntutan melalui portal Mediline. Kod klinik wajib dipetik pada setiap tuntutan." },
  { name: "MediExpress", type: "TPA", billingCycle: "Bulanan", notes: "Tuntutan melalui portal MediExpress." },
  { name: "HealthMetrics", type: "TPA", billingCycle: "Bulanan", notes: "Tuntutan melalui portal HealthMetrics." },
];

/** Subset ICD-10 yang meliputi kes GP harian. */
export const ICD10: Array<{ code: string; description: string; category: string }> = [
  { code: "J00", description: "Selesema (nasofaringitis akut)", category: "Pernafasan" },
  { code: "J06.9", description: "Jangkitan saluran pernafasan atas akut", category: "Pernafasan" },
  { code: "J02.9", description: "Faringitis akut", category: "Pernafasan" },
  { code: "J03.9", description: "Tonsilitis akut", category: "Pernafasan" },
  { code: "J01.9", description: "Sinusitis akut", category: "Pernafasan" },
  { code: "J20.9", description: "Bronkitis akut", category: "Pernafasan" },
  { code: "J30.4", description: "Rinitis alahan", category: "Pernafasan" },
  { code: "J45.9", description: "Asma", category: "Pernafasan" },
  { code: "J44.9", description: "Penyakit paru obstruktif kronik (COPD)", category: "Pernafasan" },
  { code: "J11.1", description: "Influenza dengan gejala pernafasan", category: "Pernafasan" },
  { code: "R05", description: "Batuk", category: "Simptom" },
  { code: "R50.9", description: "Demam", category: "Simptom" },
  { code: "R51", description: "Sakit kepala", category: "Simptom" },
  { code: "R42", description: "Pening kepala", category: "Simptom" },
  { code: "R11", description: "Loya dan muntah", category: "Simptom" },
  { code: "R10.4", description: "Sakit perut", category: "Simptom" },
  { code: "G43.9", description: "Migrain", category: "Saraf" },
  { code: "G47.0", description: "Insomnia", category: "Saraf" },
  { code: "A09", description: "Gastroenteritis berjangkit", category: "Gastrousus" },
  { code: "K52.9", description: "Gastroenteritis bukan berjangkit", category: "Gastrousus" },
  { code: "K30", description: "Dispepsia (angin/senak)", category: "Gastrousus" },
  { code: "K21.9", description: "Refluks gastroesofagus (GERD)", category: "Gastrousus" },
  { code: "K59.0", description: "Sembelit", category: "Gastrousus" },
  { code: "I10", description: "Darah tinggi (hipertensi primer)", category: "Kardiovaskular" },
  { code: "I50.9", description: "Kegagalan jantung", category: "Kardiovaskular" },
  { code: "E11.9", description: "Kencing manis jenis 2 tanpa komplikasi", category: "Endokrin" },
  { code: "E78.5", description: "Kolesterol tinggi (hiperlipidemia)", category: "Endokrin" },
  { code: "E66.9", description: "Obesiti", category: "Endokrin" },
  { code: "E03.9", description: "Hipotiroidisme", category: "Endokrin" },
  { code: "D50.9", description: "Anemia kekurangan zat besi", category: "Darah" },
  { code: "M54.5", description: "Sakit belakang bawah", category: "Otot & Rangka" },
  { code: "M54.2", description: "Sakit tengkuk", category: "Otot & Rangka" },
  { code: "M25.5", description: "Sakit sendi", category: "Otot & Rangka" },
  { code: "M79.1", description: "Sakit otot (mialgia)", category: "Otot & Rangka" },
  { code: "M10.9", description: "Gout", category: "Otot & Rangka" },
  { code: "S93.4", description: "Terseliuh buku lali", category: "Kecederaan" },
  { code: "S61.9", description: "Luka terbuka pergelangan tangan atau tapak tangan", category: "Kecederaan" },
  { code: "T14.9", description: "Kecederaan tidak dinyatakan", category: "Kecederaan" },
  { code: "L23.9", description: "Dermatitis sentuhan alahan", category: "Kulit" },
  { code: "L20.9", description: "Ekzema (dermatitis atopik)", category: "Kulit" },
  { code: "L30.9", description: "Dermatitis", category: "Kulit" },
  { code: "L50.9", description: "Urtikaria (kaligata)", category: "Kulit" },
  { code: "B35.9", description: "Jangkitan kulat kulit", category: "Kulit" },
  { code: "L01.0", description: "Impetigo", category: "Kulit" },
  { code: "L03.9", description: "Selulitis", category: "Kulit" },
  { code: "H10.9", description: "Konjunktivitis (sakit mata)", category: "Mata & Telinga" },
  { code: "H66.9", description: "Otitis media (jangkitan telinga tengah)", category: "Mata & Telinga" },
  { code: "H60.9", description: "Otitis externa (jangkitan telinga luar)", category: "Mata & Telinga" },
  { code: "N39.0", description: "Jangkitan saluran kencing", category: "Urologi" },
  { code: "N30.0", description: "Sistitis akut", category: "Urologi" },
  { code: "N94.6", description: "Senggugut (dismenorea)", category: "O&G" },
  { code: "Z34.9", description: "Pemantauan kehamilan normal", category: "O&G" },
  { code: "A90", description: "Demam denggi", category: "Jangkitan" },
  { code: "B34.9", description: "Jangkitan virus", category: "Jangkitan" },
  { code: "F41.9", description: "Gangguan kebimbangan", category: "Kesihatan Mental" },
  { code: "F32.9", description: "Episod kemurungan", category: "Kesihatan Mental" },
  { code: "T78.4", description: "Alahan tidak dinyatakan", category: "Alahan" },
  { code: "Z00.0", description: "Pemeriksaan kesihatan am", category: "Pemeriksaan" },
  { code: "Z23", description: "Imunisasi", category: "Pemeriksaan" },
  { code: "Z76.0", description: "Ulangan preskripsi", category: "Pemeriksaan" },
  { code: "Z02.7", description: "Pengeluaran sijil perubatan", category: "Pemeriksaan" },
];
