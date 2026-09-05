/**
 * Pemilihan batch untuk dispensari, mengikut FEFO (First Expired, First Out).
 *
 * Farmasi menggunakan FEFO dan bukan FIFO kerana yang penting ialah apa yang
 * akan luput dahulu, bukan apa yang tiba dahulu. Batch yang diterima bulan
 * lepas tetapi luput tahun depan hendaklah dikeluarkan SELEPAS batch lama yang
 * luput bulan hadapan.
 */

export interface BatchLot {
  id: string;
  batchNo: string;
  expiryDate: Date;
  quantityOnHand: number;
}

export interface Allocation {
  batchId: string;
  batchNo: string;
  expiryDate: Date;
  quantity: number;
}

export interface AllocationResult {
  allocations: Allocation[];
  /** Berapa banyak yang tidak dapat dipenuhi daripada stok boleh guna. */
  shortfall: number;
}

/**
 * Menentukan batch mana untuk mengeluarkan sejumlah kuantiti.
 *
 * Batch yang telah luput TIDAK PERNAH diperuntukkan, walaupun ia satu-satunya
 * stok yang ada. Sistem tidak boleh sekali-kali mencadangkan ubat luput kepada
 * pesakit; kekurangan dilaporkan supaya farmasi tahu perlu memesan.
 *
 * Kuantiti boleh merentasi beberapa batch. Ini berlaku dalam amalan sebenar
 * apabila baki batch lama hampir habis.
 */
export function allocateFefo(
  batches: BatchLot[],
  required: number,
  today: Date = new Date(),
): AllocationResult {
  if (required <= 0) return { allocations: [], shortfall: 0 };

  const usable = batches
    .filter((b) => b.quantityOnHand > 0 && !isExpired(b.expiryDate, today))
    // Isihan sekunder mengikut id menjadikan pemilihan stabil apabila dua batch
    // berkongsi tarikh luput, supaya cadangan tidak berubah antara muat semula.
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.id.localeCompare(b.id));

  const allocations: Allocation[] = [];
  let remaining = required;

  for (const batch of usable) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityOnHand, remaining);
    allocations.push({
      batchId: batch.id,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate,
      quantity: take,
    });
    remaining -= take;
  }

  return { allocations, shortfall: remaining };
}

/**
 * Memperuntukkan bermula daripada batch yang dipilih farmasi, kemudian jatuh
 * kembali kepada FEFO untuk bakinya.
 *
 * Digunakan apabila juruteknik menindih cadangan — contohnya kerana batch
 * cadangan berada dalam kotak yang belum dibuka.
 */
export function allocateFromBatch(
  batches: BatchLot[],
  required: number,
  preferredBatchId: string,
  today: Date = new Date(),
): AllocationResult {
  const preferred = batches.find((b) => b.id === preferredBatchId);
  if (!preferred || preferred.quantityOnHand <= 0 || isExpired(preferred.expiryDate, today)) {
    // Pilihan tidak boleh digunakan — kembali kepada FEFO biasa.
    return allocateFefo(batches, required, today);
  }

  const take = Math.min(preferred.quantityOnHand, required);
  const head: Allocation = {
    batchId: preferred.id,
    batchNo: preferred.batchNo,
    expiryDate: preferred.expiryDate,
    quantity: take,
  };

  const rest = allocateFefo(
    batches.filter((b) => b.id !== preferredBatchId),
    required - take,
    today,
  );

  return { allocations: [head, ...rest.allocations], shortfall: rest.shortfall };
}

/**
 * Batch dikira luput pada hari tarikh luputnya.
 *
 * Tarikh luput farmaseutikal bermaksud "jangan guna selepas", jadi hari itu
 * sendiri dianggap tidak selamat. Ini pilihan yang konservatif dengan sengaja.
 */
export function isExpired(expiryDate: Date, today: Date = new Date()): boolean {
  const expiry = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return expiry <= now;
}

/** Tarikh luput terawal antara batch yang diperuntukkan — dicetak pada label. */
export function earliestExpiry(allocations: Allocation[]): Allocation | null {
  if (allocations.length === 0) return null;
  return allocations.reduce((earliest, current) =>
    current.expiryDate.getTime() < earliest.expiryDate.getTime() ? current : earliest,
  );
}
