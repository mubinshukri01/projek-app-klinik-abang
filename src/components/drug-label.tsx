import { formatDateOnly } from "@/lib/dates";

export interface DrugLabelData {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  patientName: string;
  patientMrn: string;
  drugName: string;
  quantity: number;
  unit: string;
  instructions: string;
  batchNo: string | null;
  expiryDate: Date | null;
  doctorName: string | null;
  dispensedAt: Date;
}

/**
 * Label ubat untuk pesakit.
 *
 * Arahan dalam Bahasa Melayu diletakkan sebagai elemen paling menonjol —
 * itulah satu-satunya baris yang MESTI difahami pesakit di rumah. Nama ubat,
 * batch dan tarikh luput lebih kecil kerana ia untuk rujukan klinik.
 */
export function DrugLabel({ data }: { data: DrugLabelData }) {
  return (
    <article className="label">
      <header className="label-head">
        <strong>{data.clinicName}</strong>
        <span>
          {data.clinicAddress} · {data.clinicPhone}
        </span>
      </header>

      <p className="label-patient">
        <strong>{data.patientName}</strong> <span className="tabular">{data.patientMrn}</span>
      </p>

      <p className="label-drug">
        {data.drugName}
        <span className="tabular label-qty">
          {data.quantity} {data.unit}
        </span>
      </p>

      {/* Baris paling penting pada label. */}
      <p className="label-instructions">{data.instructions}</p>

      <footer className="label-foot">
        <span className="tabular">
          {formatDateOnly(data.dispensedAt)}
          {data.batchNo ? ` · Batch ${data.batchNo}` : ""}
          {data.expiryDate ? ` · Luput ${formatDateOnly(data.expiryDate)}` : ""}
        </span>
        {data.doctorName ? <span>{data.doctorName}</span> : null}
        <span className="label-warning">Simpan jauh dari kanak-kanak</span>
      </footer>
    </article>
  );
}
