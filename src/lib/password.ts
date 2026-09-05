/**
 * Peraturan kata laluan.
 *
 * Panjang minimum dipilih dan bukan peraturan kerumitan: memaksa simbol dan
 * huruf besar menghasilkan kata laluan yang ditulis pada nota melekat di
 * kaunter, yang lebih teruk daripada frasa panjang yang mudah diingat.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Kata laluan benih yang mesti ditukar sebelum klinik beroperasi. */
export const SEED_PASSWORDS = ["klinik1234"];

export function isSeedPassword(password: string): boolean {
  return SEED_PASSWORDS.includes(password);
}
