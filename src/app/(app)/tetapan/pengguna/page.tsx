import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { EmptyRow, Table, TableWrap, Td, Th } from "@/components/ui/table";
import { ROLE_LABEL, requireArea } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { SettingsNav } from "../settings-nav";
import { CreateUserForm, EditUserForm, ResetPasswordForm } from "./user-forms";

export const metadata: Metadata = { title: "Pengguna" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireArea("tetapan");

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      mmcNumber: true,
      phone: true,
      active: true,
      lastLoginAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Pengguna" description="Akaun kakitangan dan peranan mereka." />
      <SettingsNav />

      <Card>
        <CardHeader
          title="Senarai pengguna"
          description="Setiap kakitangan mesti mempunyai akaun sendiri — jejak audit PDPA bergantung padanya."
        />
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Nama pengguna</Th>
                <Th>Nama penuh</Th>
                <Th>Peranan</Th>
                <Th>No. MMC</Th>
                <Th>Log masuk terakhir</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <EmptyRow colSpan={7}>Tiada pengguna.</EmptyRow>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <Td className="tabular font-medium">{u.username}</Td>
                    <Td>{u.name}</Td>
                    <Td className="text-ink-soft">{ROLE_LABEL[u.role]}</Td>
                    <Td className="tabular text-ink-soft">{u.mmcNumber ?? "-"}</Td>
                    <Td className="tabular text-ink-soft">{formatDateTime(u.lastLoginAt)}</Td>
                    <Td>
                      <Badge tone={u.active ? "ok" : "danger"}>
                        {u.active ? "Aktif" : "Dinyahaktif"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="space-y-2">
                        <EditUserForm
                          user={{
                            id: u.id,
                            username: u.username,
                            name: u.name,
                            role: u.role,
                            mmcNumber: u.mmcNumber,
                            phone: u.phone,
                            active: u.active,
                          }}
                          isSelf={u.id === admin.id}
                        />
                        <ResetPasswordForm userId={u.id} username={u.username} />
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader title="Cipta pengguna baharu" />
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
