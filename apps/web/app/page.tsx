import { redirect } from 'next/navigation';

/**
 * Root route → onboarding'e yönlendir.
 * Auth aktif olunca middleware authenticated user'ları dashboard'a yollar.
 */
export default function HomePage() {
  redirect('/onboarding');
}
