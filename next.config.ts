import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Binaan "standalone" menghasilkan pelayan yang serba lengkap dengan hanya
   * node_modules yang benar-benar digunakan. Ini menjadikan imej mini PC klinik
   * jauh lebih kecil dan mula lebih pantas selepas kuasa terputus.
   */
  output: "standalone",

  /*
   * Klinik berada di belakang proksi terbalik dalam premis. Jangan dedahkan
   * versi rangka kerja kepada pelayar di rangkaian klinik.
   */
  poweredByHeader: false,
};

export default nextConfig;
