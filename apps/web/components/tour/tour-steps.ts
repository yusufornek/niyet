/**
 * Tour Steps — ilk-giriş 15-adım akış tanımı.
 *
 * Her adımda:
 * - route: hedef sayfa (router push)
 * - selector: target element CSS selector (genelde data-tour="x")
 *   null ise full-screen narration (target highlight yok)
 * - title + body: narration kart içeriği
 *
 * Element bulunamazsa spotlight skip, narration kart yine gösterilir.
 */

export interface TourStep {
  /// Yönlenecek sayfa
  route: string;
  /// Hedef element selector. null → full-screen narration only.
  selector: string | null;
  /// Kart başlığı
  title: string;
  /// Kart açıklama metni
  body: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    route: '/dashboard',
    selector: '[data-tour="welcome-hero"]',
    title: "Niyet'e hoş geldin 👋",
    body: 'Sana finansal disiplinin ölçülebilir karşılığını göstereceğim. Hadi başlayalım — birkaç adımda tüm uygulamayı tanıyacaksın.',
  },
  {
    route: '/dashboard',
    selector: '[data-tour="notification-bell"]',
    title: 'Bildirimler',
    body: 'Limit uyarıları, hedef milestone’ları ve kategori farkları buradan görünür. Üzerindeki kırmızı sayı okunmamış bildirimleri gösterir.',
  },
  {
    route: '/dashboard',
    selector: '[data-tour="snapshot-card"]',
    title: 'Bir bakışta',
    body: 'Bu ay fırsat, Gelecek Skorun ve toplam katkın — tek bakışta finansal durumun. Her satıra dokun, detayına git.',
  },
  {
    route: '/dashboard',
    selector: '[data-tour="monthly-target"]',
    title: 'Aylık katkı hedefi',
    body: 'Bu ay birikim hedefini koy. Yaklaşınca otomatik bildirim alırsın, hedefe ulaşınca tebrik notif gelir.',
  },
  {
    route: '/dashboard',
    selector: '[data-tour="tab-savings"]',
    title: 'Birikim sekmesi',
    body: 'Alt tab’da Birikim — Tasarruf Radarı ve Hedeflerin bu sekmede birleşti.',
  },
  {
    route: '/savings?tab=radar',
    selector: '[data-tour="radar-donut"]',
    title: 'Tasarruf Radarı',
    body: 'AI son 30 günde nelerden tasarruf edebileceğini buluyor. Kategorilerden seçim yap, ne kadar azaltılabilir olduğunu gör.',
  },
  {
    route: '/savings?tab=goals',
    selector: '[data-tour="goals-list"]',
    title: 'Hedeflerin',
    body: 'MacBook, ev peşinatı gibi hedefleri takip et — fiyat artışı, ETA (kalan ay), ilerleme yüzdesi otomatik hesaplanır.',
  },
  {
    route: '/dashboard',
    selector: '[data-tour="tab-chatbot"]',
    title: 'AI Tasarruf Koçu',
    body: 'Asistan sekmesi. Sor: "Bu ay nasıl gidiyorum?", "Kahveden nasıl tasarruf ederim?" — Gemini AI yanıtlar.',
  },
  {
    route: '/dashboard',
    selector: '[data-tour="tab-menu"]',
    title: 'Tüm özellikler menüde',
    body: 'Bildirimler, Çemberler, Skor, Ayarlar, Bağlı Kartlarım — hepsi Menü sekmesinde toplandı.',
  },
  {
    route: '/menu',
    selector: '[data-tour="menu-search"]',
    title: 'Hızlı arama',
    body: 'Hangi sayfayı aradığını biliyorsan buraya yaz. Tüm sayfalar arasında anında filtreleme.',
  },
  {
    route: '/menu',
    selector: '[data-tour="menu-cards-link"]',
    title: 'Bağlı Kartlarım',
    body: 'Tasarruflarının otomatik kesildiği kartlar burada. Kart üzerine dokunca arka yüze döner.',
  },
  {
    route: '/impact',
    selector: '[data-tour="impact-hero"]',
    title: 'Niyet etkim',
    body: 'Toplam katkın, aylık + yıllık potansiyel, 30 yıl projeksiyonu. Niyet’in sana sağladığı somut değer.',
  },
  {
    route: '/score',
    selector: '[data-tour="score-hero"]',
    title: 'Gelecek Skorum',
    body: 'Finansal disiplin puanın 0-100. Her saat yeniden hesaplanır — düzenli katkı, dengeli harcama, çember katılımı puanı yükseltir.',
  },
  {
    route: '/circles',
    selector: '[data-tour="circles-list"]',
    title: 'Çemberler',
    body: 'Aile veya arkadaşlarla ortak birikim hedefi kur. Davet kodu ile katıl, milestone’larda hepiniz bildirim alın.',
  },
  {
    route: '/dashboard',
    selector: null,
    title: 'Hazırsın 🎉',
    body: 'Niyet ile birikim yolculuğun başlıyor. Tur’u tekrar görmek istersen Ayarlar → "Turu tekrar başlat" diyebilirsin.',
  },
] as const;
