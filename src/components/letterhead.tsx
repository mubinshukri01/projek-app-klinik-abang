import { formatDateOnly } from "@/lib/dates";

export interface ClinicHeader {
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  postcode: string;
  city: string;
  state: string;
  phone: string;
  registrationNo: string | null;
}

/** Kepala surat klinik untuk dokumen A4. */
export function Letterhead({ clinic }: { clinic: ClinicHeader | null }) {
  if (!clinic) return null;
  return (
    <header className="doc-head">
      <h1>{clinic.name}</h1>
      <p>
        {clinic.addressLine1}
        {clinic.addressLine2 ? `, ${clinic.addressLine2}` : ""}, {clinic.postcode} {clinic.city},{" "}
        {clinic.state}
      </p>
      <p>
        Tel: {clinic.phone}
        {clinic.registrationNo ? ` · No. Pendaftaran: ${clinic.registrationNo}` : ""}
      </p>
    </header>
  );
}

/** Blok tandatangan doktor yang muncul di bawah setiap dokumen klinikal. */
export function SignatureBlock({
  doctorName,
  mmcNumber,
  issuedAt,
}: {
  doctorName: string;
  mmcNumber: string | null;
  issuedAt: Date;
}) {
  return (
    <div className="doc-sign">
      <div className="doc-sign-line" />
      <p className="doc-sign-name">{doctorName}</p>
      {/* Nombor MMC dicetak kerana majikan dan syarikat insurans menyemaknya. */}
      {mmcNumber ? <p>No. Pendaftaran MMC: {mmcNumber}</p> : null}
      <p>Tarikh: {formatDateOnly(issuedAt)}</p>
      <p className="doc-stamp">Cop klinik</p>
    </div>
  );
}
