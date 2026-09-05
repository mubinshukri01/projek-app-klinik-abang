import { Button } from "@/components/ui/button";

/**
 * Borang POST sebenar dan bukan pautan — lihat src/app/logout/route.ts untuk
 * sebab log keluar tidak boleh dicetuskan oleh permintaan GET.
 */
export function LogoutButton() {
  return (
    <form action="/logout" method="post">
      <Button type="submit" variant="ghost" size="sm">
        Log Keluar
      </Button>
    </form>
  );
}
