import { canAccess, getSessionUser } from "@/lib/auth";
import { buildCsv } from "@/lib/csv";
import { formatDateOnly } from "@/lib/dates";
import { formatAmount } from "@/lib/money";
import { formatIc } from "@/lib/mykad";
import { prisma } from "@/lib/prisma";

/**
 * Memuat turun tuntutan sebagai CSV untuk dimasukkan ke portal TPA.
 *
 * Lajur dipilih mengikut apa yang portal panel biasanya minta: rujukan invois,
 * pengenalan pesakit, no. ahli dan GL daripada kad panel, diagnosis, dan amaun.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  // Pengendali laluan tidak mengubah hala seperti halaman, jadi tolak terus.
  const user = await getSessionUser();
  if (!user) return new Response("Perlu log masuk.", { status: 401 });
  if (!canAccess(user.role, "panel")) return new Response("Akses ditolak.", { status: 403 });

  const { claimId } = await params;

  const claim = await prisma.panelClaim.findUnique({
    where: { id: claimId },
    select: {
      claimNo: true,
      periodStart: true,
      periodEnd: true,
      panel: { select: { name: true, clinicCode: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          amount: true,
          invoice: {
            select: {
              invoiceNo: true,
              issuedAt: true,
              visit: {
                select: {
                  employeeId: true,
                  glNumber: true,
                  patient: { select: { name: true, idType: true, idNumber: true } },
                  consultation: {
                    select: { diagnoses: { select: { icd10Code: true, description: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!claim) return new Response("Tuntutan tidak dijumpai.", { status: 404 });

  const rows = claim.items.map((item) => {
    const visit = item.invoice.visit;
    const patient = visit.patient;
    const diagnoses = visit.consultation?.diagnoses ?? [];
    const idLabel =
      patient.idType === "MYKAD" || patient.idType === "MYKID"
        ? formatIc(patient.idNumber)
        : patient.idNumber;

    return [
      claim.panel.clinicCode ?? "",
      item.invoice.invoiceNo,
      formatDateOnly(item.invoice.issuedAt),
      patient.name,
      idLabel,
      visit.employeeId ?? "",
      visit.glNumber ?? "",
      diagnoses.map((d) => `${d.icd10Code} ${d.description}`).join("; "),
      formatAmount(item.amount),
    ];
  });

  const csv = buildCsv(
    [
      "Kod Klinik",
      "No. Invois",
      "Tarikh",
      "Nama Pesakit",
      "No. Pengenalan",
      "No. Ahli",
      "No. GL",
      "Diagnosis",
      "Amaun (RM)",
    ],
    rows,
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${claim.claimNo}.csv"`,
      // Tuntutan berubah apabila bayaran direkod; jangan hidangkan salinan lama.
      "Cache-Control": "no-store",
    },
  });
}
