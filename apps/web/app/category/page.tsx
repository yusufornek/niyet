/**
 * Kategori detayı /category/[ID] route'una taşındı (örn /category/COFFEE).
 * Eski erişimler Radar'a yönlendirilir.
 */
import { redirect } from 'next/navigation';

export default function CategoryRootPage() {
  redirect('/radar');
}
