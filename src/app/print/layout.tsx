import "@/app/globals.css";

/**
 * Susun atur cetakan.
 *
 * Sengaja tiada navigasi, pengepala atau kekunci aplikasi — halaman ini
 * dibuka dalam tab baharu dan terus dihantar ke pencetak.
 */
export default function PrintLayout({ children }: LayoutProps<"/print">) {
  return <div className="print-root">{children}</div>;
}
