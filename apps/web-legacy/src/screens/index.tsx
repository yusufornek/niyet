import PhoneShell from "@/components/PhoneShell";
import WalletReveal from "@/components/WalletReveal";
import ScoreCard from "@/components/ScoreCard";
import { useApp, categories, subscriptions } from "@/store/useApp";
import { useEffect, useState } from "react";
import { Check, X, Sparkles, TrendingUp, Shield, CreditCard, Pause, Users, BookOpen, Send, AlertTriangle, ArrowRight, Info, Settings, Share2, ChevronRight, History as HistoryIcon, GraduationCap, Plus } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("tr-TR") + " ₺";

/* 1. ONBOARDING — multi-slide */
export function Onboarding() {
  const go = useApp((s) => s.go);
  const [i, setI] = useState(0);
  const slides = [
    {
      eyebrow: "Niyet",
      title: <>Harcamadığını <span className="text-[hsl(var(--primary-on-dark))]">geleceğine</span> aktar.</>,
      body: "AI destekli mikro emeklilik ve birikim asistanın.",
    },
    {
      eyebrow: "Nasıl çalışır",
      title: <>Harcamalarını <span className="text-[hsl(var(--primary-on-dark))]">izinli</span> şekilde analiz eder.</>,
      body: "Azaltabileceğin kategorileri ve fırsat tutarlarını görürsün.",
    },
    {
      eyebrow: "Karar senin",
      title: <>Küçük tasarruflar, <span className="text-[hsl(var(--primary-on-dark))]">büyük</span> birikim.</>,
      body: "Onayladığın tutarları mikro katkıya dönüştür. Kontrol her zaman sende.",
    },
  ];
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <PhoneShell dark hideTabs scroll={false}>
      <div className="h-full flex flex-col justify-between pt-10">
        <div className="space-y-6">
          <div className="ny-eyebrow text-white/60">{s.eyebrow}</div>
          <h1 className="text-[40px] leading-[1.05] font-semibold ny-tight">{s.title}</h1>
          <p className="text-[17px] leading-snug text-white/70 max-w-[300px]">{s.body}</p>
        </div>
        <div className="space-y-4 pb-4">
          <div className="flex justify-center gap-2">
            {slides.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
            ))}
          </div>
          <button className="ny-pill w-full" onClick={() => (last ? go("consent") : setI(i + 1))}>
            {last ? "Başla" : "Devam"}
          </button>
          <button className="ny-pill-ghost w-full text-white border-white/40" onClick={() => go("dashboard")}>
            Demo modunda dene
          </button>
          <p className="text-[11px] text-white/40 text-center pt-1">Yatırım tavsiyesi içermez.</p>
        </div>
      </div>
    </PhoneShell>
  );
}

/* 2. CONSENT */
export function Consent() {
  const go = useApp((s) => s.go);
  const [ok, setOk] = useState(false);
  return (
    <PhoneShell title="Veri izni" back hideTabs>
      <p className="ny-tagline mb-5">Verilerin yalnızca tasarruf fırsatlarını hesaplamak için kullanılır. İstediğin zaman bağlantıyı Ayarlar'dan kesebilirsin.</p>
      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-3">Kullanılacak veriler</div>
        <ul className="space-y-3 text-[15px]">
          <li className="flex gap-3"><Check size={18} className="text-primary mt-0.5" />Harcama kategorileri</li>
          <li className="flex gap-3"><Check size={18} className="text-primary mt-0.5" />İşlem tutarları ve tarih</li>
          <li className="flex gap-3"><Check size={18} className="text-primary mt-0.5" />Tekrar eden ödemeler</li>
        </ul>
      </div>
      <div className="ny-card mb-5 flex items-start gap-3">
        <Shield size={20} className="text-primary shrink-0 mt-0.5" />
        <p className="text-[13px] text-[hsl(var(--ink-muted-80))]">Hiçbir veri üçüncü taraflarla paylaşılmaz. Bağlantı kesildiğinde veriler silinir.</p>
      </div>
      <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 w-5 h-5 accent-[hsl(var(--primary))]" />
        <span className="text-[14px]">Açık rıza ile veri işlenmesini kabul ediyorum.</span>
      </label>
      <button className="ny-pill w-full disabled:opacity-40" disabled={!ok} onClick={() => go("connect")}>
        Devam et
      </button>
    </PhoneShell>
  );
}

/* 3. CONNECT */
export function Connect() {
  const { go, setConnected } = useApp();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const banks: { name: string; connected?: boolean }[] = [
    { name: "Garanti BBVA", connected: true },
    { name: "İş Bankası", connected: true },
    { name: "Akbank", connected: true },
    { name: "Yapı Kredi" },
    { name: "Ziraat" },
  ];
  const tryConnect = (fail = false) => {
    setState("loading");
    setTimeout(() => {
      if (fail) setState("error");
      else { setConnected(true); go("radar"); }
    }, 1100);
  };
  return (
    <PhoneShell title="Banka bağla" back hideTabs>
      <WalletReveal balance="₺ 18.400,00" hint="Cüzdanın üzerine gel — bakiyeni gör" />
      <p className="ny-tagline mb-5">Hesabını güvenli şekilde bağla. Demo modunda gerçek veri kullanılmaz.</p>
      <button onClick={() => tryConnect(false)} className="ny-card w-full text-left mb-3 flex items-center justify-between">
        <span className="flex items-center gap-3"><Sparkles size={20} className="text-primary" /> <span className="font-semibold">Demo bağlantı</span></span>
        <ArrowRight size={18} className="opacity-60" />
      </button>
      <div className="ny-eyebrow mt-4 mb-2">Bankalar</div>
      <div className="space-y-2">
        {banks.map((b) => (
          <button
            key={b.name}
            onClick={() => tryConnect(false)}
            className="ny-card w-full text-left flex items-center justify-between"
          >
            <span className="flex items-center gap-3">
              <CreditCard size={20} className={b.connected ? "text-primary" : "opacity-70"} /> {b.name}
            </span>
            {b.connected ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Check size={14} /> Bağlı
              </span>
            ) : (
              <ArrowRight size={16} className="opacity-50" />
            )}
          </button>
        ))}
      </div>
      {state === "loading" && <p className="text-center mt-6 text-sm opacity-70">Bağlanıyor…</p>}
      {state === "error" && (
        <div className="ny-card mt-6 border-destructive/30">
          <div className="flex items-center gap-2 text-destructive font-semibold mb-1"><AlertTriangle size={18} /> Bağlantı başarısız</div>
          <p className="text-sm opacity-70">Lütfen tekrar deneyin. Demo bağlantıyı da kullanabilirsin.</p>
        </div>
      )}
      <button onClick={() => tryConnect(true)} className="text-xs text-primary mt-4 w-full text-center">Hata durumunu simüle et</button>
    </PhoneShell>
  );
}

/* 4. DASHBOARD */
export function Dashboard() {
  const { go, acceptedSavings, goals, paused } = useApp();
  const goal = goals[0];
  return (
    <PhoneShell rightSlot={<button onClick={() => go("settings")} aria-label="Ayarlar" className="p-1"><Settings size={20} className="opacity-70" /></button>}>
      <div className="pt-2 pb-4">
        <div className="ny-eyebrow">Merhaba Deniz</div>
        <h1 className="ny-h1 mt-1">Bu ay 2.450 ₺ kurtarabilirsin.</h1>
      </div>

      {paused && (
        <div className="ny-card mb-3 flex items-center gap-3 border-primary/30">
          <Pause size={18} className="text-primary" />
          <div className="text-sm flex-1">Katkıların duraklatıldı.</div>
          <button onClick={() => go("pause")} className="text-primary text-sm font-semibold">Yönet</button>
        </div>
      )}

      <ScoreCard
        score={68}
        delta={4}
        title="İyi gidiyorsun"
        subtitle="Üzerine gel — genel istatistiklerini gör."
        status="Sağlıklı finansal ritim"
        onOpen={() => go("score")}
        stats={[
          { label: "Kabul edilen tasarruf", value: fmt(acceptedSavings || 1850), foot: "son 30 gün" },
          { label: "Aktif kural", value: `${useApp.getState().rules.length}`, foot: "otomatik katkı" },
          { label: "Hedef ilerleme", value: `${Math.round((goal.current / goal.target) * 100)}%`, foot: goal.name },
          { label: "Bu ay fırsat", value: "2.450 ₺", foot: "azaltılabilir" },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={() => go("radar")} className="ny-card text-left">
          <div className="ny-eyebrow">Fırsat</div>
          <div className="text-2xl font-semibold mt-1">2.450 ₺</div>
          <div className="text-xs opacity-60 mt-1">azaltılabilir harcama</div>
        </button>
        <button onClick={() => go("rule")} className="ny-card text-left">
          <div className="ny-eyebrow">Önerilen katkı</div>
          <div className="text-2xl font-semibold mt-1 text-primary">750 ₺</div>
          <div className="text-xs opacity-60 mt-1">bu ay</div>
        </button>
      </div>

      <button onClick={() => go("goals")} className="ny-card w-full text-left mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="ny-eyebrow">Aktif hedef</div>
            <div className="font-semibold mt-1">{goal.name}</div>
          </div>
          <div className="text-sm opacity-60">{Math.round((goal.current / goal.target) * 100)}%</div>
        </div>
        <div className="h-2 bg-[hsl(var(--divider-soft))] rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${(goal.current / goal.target) * 100}%` }} />
        </div>
        <div className="text-xs opacity-60 mt-2">{fmt(goal.current)} / {fmt(goal.target)}</div>
      </button>

      <div className="ny-eyebrow mt-5 mb-2">Hızlı erişim</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <QuickTile icon={<Pause size={18} />} label="Nefes ayı" onClick={() => go("pause")} />
        <QuickTile icon={<Users size={18} />} label="Çemberler" onClick={() => go("circles")} />
        <QuickTile icon={<HistoryIcon size={18} />} label="Geçmiş" onClick={() => go("history")} />
        <QuickTile icon={<CreditCard size={18} />} label="Abonelik" onClick={() => go("subscriptions")} />
        <QuickTile icon={<GraduationCap size={18} />} label="Öğren" onClick={() => go("learn")} />
        <QuickTile icon={<TrendingUp size={18} />} label="Fonlar" onClick={() => go("funds")} />
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow">Yaklaşan</div>
        <div className="mt-2 text-sm">28 Mayıs · Maaş günü katkısı <span className="text-primary font-semibold">1.000 ₺</span></div>
      </div>

      <button onClick={() => go("demoResult")} className="ny-pill-ghost w-full">Demo özetini gör</button>
      {acceptedSavings > 0 && (
        <p className="text-xs text-primary text-center mt-3">Bu oturumda {fmt(acceptedSavings)} katkıya dönüştürdün ✨</p>
      )}
    </PhoneShell>
  );
}

function QuickTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ny-card !p-3 flex flex-col items-center gap-2 text-center">
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

/* 5. RADAR — visual */
const RADAR_COLORS: Record<string, string> = {
  coffee: "#8B5E34",
  dining: "#E07A5F",
  subs: "#7A7A7A",
  shopping: "#0066CC",
  transport: "#3D5A80",
};

export function Radar() {
  const { go, selectCategory, acceptSaving } = useApp();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const totalOpp = categories.reduce((s, c) => s + c.opportunity, 0);
  const active = categories.find((c) => c.id === hoverId);

  // Donut math
  const R = 70, STROKE = 22, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = categories.map((c) => {
    const portion = c.spent / totalSpent;
    const dash = portion * C;
    const arc = { id: c.id, color: RADAR_COLORS[c.id], dash, gap: C - dash, offset: -offset };
    offset += dash;
    return arc;
  });

  return (
    <PhoneShell title="Tasarruf Radarı">
      <p className="ny-tagline mb-4">Aylık harcamanın dağılımı ve azaltabileceğin pay.</p>

      {!loading && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Harcama</div>
            <div className="text-base font-semibold ny-tight mt-1">{fmt(totalSpent)}</div>
          </div>
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Fırsat payı</div>
            <div className="text-base font-semibold ny-tight mt-1 text-primary">%{Math.round((totalOpp / totalSpent) * 100)}</div>
          </div>
          <div className="ny-card !p-3 text-center">
            <div className="ny-eyebrow !text-[10px]">Kabul edilen</div>
            <div className="text-base font-semibold ny-tight mt-1">{Object.values(accepted).filter(Boolean).length}<span className="text-xs opacity-50">/{categories.filter(c=>c.reducible).length}</span></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ny-card animate-pulse h-[280px]" />
      ) : (
        <>
          {/* Donut */}
          <div className="ny-card mb-3 flex flex-col items-center !py-6">
            <div className="relative w-[200px] h-[200px]">
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                <circle cx="100" cy="100" r={R} fill="none" stroke="hsl(var(--divider-soft))" strokeWidth={STROKE} />
                {arcs.map((a) => (
                  <circle
                    key={a.id}
                    cx="100" cy="100" r={R} fill="none"
                    stroke={a.color}
                    strokeWidth={hoverId && hoverId !== a.id ? STROKE - 4 : STROKE}
                    strokeDasharray={`${a.dash} ${a.gap}`}
                    strokeDashoffset={a.offset}
                    strokeLinecap="butt"
                    onMouseEnter={() => setHoverId(a.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setHoverId(a.id === hoverId ? null : a.id)}
                    className="cursor-pointer transition-all"
                    style={{ opacity: hoverId && hoverId !== a.id ? 0.35 : 1 }}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                {active ? (
                  <>
                    <div className="text-2xl">{active.icon}</div>
                    <div className="text-xl font-semibold ny-tight mt-1">{fmt(active.spent)}</div>
                    <div className="text-[11px] opacity-60 mt-0.5">{active.name}</div>
                  </>
                ) : (
                  <>
                    <div className="ny-eyebrow">Bu ay</div>
                    <div className="text-2xl font-semibold ny-tight mt-1">{fmt(totalSpent)}</div>
                    <div className="text-[11px] text-primary mt-1">+{fmt(totalOpp)} fırsat</div>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setHoverId(c.id === hoverId ? null : c.id)}
                  className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full transition-opacity ${hoverId && hoverId !== c.id ? "opacity-40" : ""}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: RADAR_COLORS[c.id] }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Opportunity vs spent — stacked summary */}
          <div className="ny-tile-dark mb-3">
            <div className="text-white/60 text-xs uppercase tracking-wider">Azaltılabilir pay</div>
            <div className="flex items-end justify-between mt-1">
              <div className="text-3xl font-semibold ny-tight">%{Math.round((totalOpp / totalSpent) * 100)}</div>
              <div className="text-[hsl(var(--primary-on-dark))] text-sm">{fmt(totalOpp)} / {fmt(totalSpent)}</div>
            </div>
            <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden flex">
              <div className="h-full bg-[hsl(var(--primary-on-dark))]" style={{ width: `${(totalOpp / totalSpent) * 100}%` }} />
            </div>
          </div>

          {/* Category bars */}
          <div className="ny-eyebrow mb-2">Kategoriler</div>
          <div className="space-y-2">
            {categories.map((c) => {
              const isAcc = accepted[c.id];
              const pct = (c.spent / totalSpent) * 100;
              const oppPct = c.spent > 0 ? (c.opportunity / c.spent) * 100 : 0;
              return (
                <div
                  key={c.id}
                  className={`ny-card !p-3 transition-all ${hoverId === c.id ? "ring-2 ring-primary/40" : ""}`}
                  onMouseEnter={() => setHoverId(c.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <button
                    className="w-full"
                    onClick={() => { selectCategory(c.id); go("category"); }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{c.name}</span>
                          <span className="text-xs opacity-60">{fmt(c.spent)}</span>
                        </div>
                        <div className="h-1.5 bg-[hsl(var(--divider-soft))] rounded-full mt-2 overflow-hidden relative">
                          <div className="h-full" style={{ width: `${pct}%`, background: RADAR_COLORS[c.id] }} />
                          {c.reducible && (
                            <div className="absolute top-0 h-full bg-primary/80" style={{ left: `${pct - (pct * oppPct / 100)}%`, width: `${pct * oppPct / 100}%` }} />
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] mt-1">
                          <span className="opacity-50">%{Math.round(pct)} pay</span>
                          {c.reducible ? (
                            <span className="text-primary font-semibold">+{fmt(c.opportunity)}</span>
                          ) : (
                            <span className="opacity-50">Azaltılamaz</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  {c.reducible && (
                    <div className="flex gap-2 mt-2 pl-9">
                      <button
                        disabled={isAcc}
                        onClick={() => { setAccepted((a) => ({ ...a, [c.id]: true })); acceptSaving(c.opportunity); }}
                        className="ny-pill-sm flex-1 disabled:opacity-50 !py-1.5 !text-xs"
                      >
                        {isAcc ? "Kabul edildi ✓" : "Katkıya dönüştür"}
                      </button>
                      <button className="ny-chip !py-1" onClick={() => setAccepted((a) => ({ ...a, [c.id]: false }))}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => go("history")} className="text-primary text-sm mt-5 w-full text-center">Geçmiş analizleri gör →</button>
        </>
      )}
    </PhoneShell>
  );
}


/* 6. CATEGORY DETAIL */
export function Category() {
  const { selectedCategoryId, go } = useApp();
  const c = categories.find((x) => x.id === selectedCategoryId) ?? categories[0];
  const [cat, setCat] = useState(c.name);
  const [feedback, setFeedback] = useState("");
  const cats = ["Kahve", "Dışarı yemek", "Market", "Eğlence", "Online alışveriş", "Ulaşım", "Abonelikler"];
  return (
    <PhoneShell title={c.name} back>
      <div className="ny-tile-dark mb-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Bu ay</div>
        <div className="text-4xl font-semibold mt-1 ny-tight">{fmt(c.spent)}</div>
        <div className="text-white/60 text-sm mt-1">Ortalama: {fmt(c.avg)}</div>
      </div>

      <div className="ny-card mb-4">
        <div className="ny-eyebrow">Yanlış kategori mi?</div>
        <p className="text-sm mt-1 opacity-70 mb-3">Sınıflandırmayı düzelt, analizler güncellenir.</p>
        <div className="flex flex-wrap gap-2">
          {cats.map((x) => (
            <button key={x} onClick={() => setCat(x)} className={`ny-chip ${cat === x ? "border-primary text-primary" : ""}`}>
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-2">Geri bildirim</div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Bu kategori için bir not bırak…"
          className="w-full bg-[hsl(var(--canvas-parchment))] rounded-xl p-3 text-sm outline-none border border-[hsl(var(--hairline))]"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="ny-pill" onClick={() => go("rule")}>Kural oluştur</button>
        <button className="ny-pill-ghost" onClick={() => go("radar")}>Kaydet</button>
      </div>
    </PhoneShell>
  );
}

/* 7. RULE — with category selector */
export function Rule() {
  const { go, addRule, selectedCategoryId } = useApp();
  const [freq, setFreq] = useState("Aylık");
  const [amount, setAmount] = useState(750);
  const [salaryRule, setSalaryRule] = useState(true);
  const [diffRule, setDiffRule] = useState(true);
  const reducible = categories.filter((c) => c.reducible);
  const initial = selectedCategoryId && reducible.find((c) => c.id === selectedCategoryId)?.id || reducible[0].id;
  const [diffCat, setDiffCat] = useState(initial);
  const diffCatName = reducible.find((c) => c.id === diffCat)?.name ?? "";
  return (
    <PhoneShell title="Mikro katkı" back>
      <div className="ny-tile-dark mb-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">Yıllık potansiyel</div>
        <div className="text-4xl font-semibold mt-1 ny-tight">{fmt(amount * 12)}</div>
        <div className="text-white/60 text-sm mt-1">Aylık {fmt(amount)} katkıyla</div>
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-2">Sıklık</div>
        <div className="flex gap-2">
          {["Tek seferlik", "Haftalık", "Aylık"].map((f) => (
            <button key={f} onClick={() => setFreq(f)} className={`ny-chip flex-1 justify-center ${freq === f ? "border-primary text-primary" : ""}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-2">Tutar</div>
        <input
          type="range" min={100} max={3000} step={50} value={amount}
          onChange={(e) => setAmount(+e.target.value)}
          className="w-full accent-[hsl(var(--primary))]"
        />
        <div className="flex justify-between text-xs opacity-60 mt-1">
          <span>100 ₺</span><span className="text-primary font-semibold text-base">{fmt(amount)}</span><span>3.000 ₺</span>
        </div>
      </div>

      <Toggle label="Maaş günü 1.000 ₺ otomatik katkı" value={salaryRule} onChange={setSalaryRule} />

      <div className="ny-card mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm pr-3">Ortalamanın altında kalan farkı katkıya aktar</span>
          <button
            onClick={() => setDiffRule(!diffRule)}
            className={`w-11 h-7 rounded-full p-0.5 transition-colors shrink-0 ${diffRule ? "bg-primary" : "bg-[hsl(var(--divider-soft))]"}`}
          >
            <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${diffRule ? "translate-x-4" : ""}`} />
          </button>
        </div>
        {diffRule && (
          <>
            <div className="ny-eyebrow mt-3 mb-2">Kategori</div>
            <div className="flex flex-wrap gap-2">
              {reducible.map((c) => (
                <button key={c.id} onClick={() => setDiffCat(c.id)} className={`ny-chip ${diffCat === c.id ? "border-primary text-primary" : ""}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
            <p className="text-xs opacity-60 mt-2">{diffCatName} ortalamanın altında kaldığında fark katkıya aktarılır.</p>
          </>
        )}
      </div>

      <p className="text-xs opacity-60 my-4 flex gap-2"><Info size={14} className="shrink-0 mt-0.5" /> Onayın olmadan hiçbir katkı işlemi başlatılmaz.</p>

      <button
        className="ny-pill w-full"
        onClick={() => {
          addRule({ label: `${freq} katkı`, amount: fmt(amount), freq });
          go("goals");
        }}
      >
        Kuralı kaydet
      </button>
    </PhoneShell>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="ny-card mb-3 flex items-center justify-between">
      <span className="text-sm pr-3">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-7 rounded-full p-0.5 transition-colors shrink-0 ${value ? "bg-primary" : "bg-[hsl(var(--divider-soft))]"}`}
      >
        <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : ""}`} />
      </button>
    </div>
  );
}

/* 8. GOALS */
export function Goals() {
  const { goals, addGoal, go, selectGoal } = useApp();
  const [name, setName] = useState("");
  const [target, setTarget] = useState(50000);
  const [date, setDate] = useState("2030");
  const open = (id: string) => { selectGoal(id); go("goalDetail"); };
  return (
    <PhoneShell title="Hedefler">
      <div className="space-y-3 mb-5">
        {goals.map((g) => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          const drift = g.currentPrice && g.basePrice ? Math.round(((g.currentPrice - g.basePrice) / g.basePrice) * 100) : 0;
          return (
            <button key={g.id} onClick={() => open(g.id)} className="ny-card w-full text-left">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{g.name}</div>
                <div className="text-xs opacity-60">{g.date}</div>
              </div>
              <div className="h-2 bg-[hsl(var(--divider-soft))] rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="opacity-60">{fmt(g.current)} / {fmt(g.currentPrice ?? g.target)}</span>
                {drift > 0 && (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <TrendingUp size={12} /> +%{drift} fiyat
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="ny-card">
        <div className="ny-eyebrow mb-3">Yeni hedef</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {["Emeklilik", "Eğitim", "Ev peşinatı", "Araç", "Tatil", "Özel"].map((p) => (
            <button key={p} onClick={() => setName(p)} className={`ny-chip ${name === p ? "border-primary text-primary" : ""}`}>{p}</button>
          ))}
        </div>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Hedef adı"
          className="w-full bg-[hsl(var(--canvas-parchment))] rounded-xl p-3 text-sm border border-[hsl(var(--hairline))] mb-3"
        />
        <label className="block text-xs opacity-60 mb-1">Hedef tutar (₺)</label>
        <input
          type="number" value={target} onChange={(e) => setTarget(+e.target.value)} placeholder="Hedef tutar"
          className="w-full bg-[hsl(var(--canvas-parchment))] rounded-xl p-3 text-sm border border-[hsl(var(--hairline))] mb-3"
        />
        <label className="block text-xs opacity-60 mb-1">Hedef yılı</label>
        <input
          type="number" value={date} onChange={(e) => setDate(e.target.value)} placeholder="2030"
          className="w-full bg-[hsl(var(--canvas-parchment))] rounded-xl p-3 text-sm border border-[hsl(var(--hairline))] mb-3"
        />
        <button
          onClick={() => { if (name) { const id = addGoal({ name, target, date }); setName(""); selectGoal(id); go("goalDetail"); } }}
          className="ny-pill w-full"
        >Hedef oluştur</button>
      </div>

      <button onClick={() => go("funds")} className="text-primary text-sm mt-5 w-full">Fon seçeneklerini incele →</button>
    </PhoneShell>
  );
}

/* 8b. GOAL DETAIL — PBI 3-11 */
export function GoalDetail() {
  const { goals, selectedGoalId, updateGoal, go } = useApp();
  const goal = goals.find((g) => g.id === selectedGoalId) ?? goals[0];
  if (!goal) {
    return (
      <PhoneShell title="Hedef" back>
        <p className="ny-tagline">Henüz hedef yok.</p>
      </PhoneShell>
    );
  }
  const base = goal.basePrice ?? goal.target;
  const currentPrice = goal.currentPrice ?? goal.target;
  const inflation = goal.inflationPct ?? 28;
  const monthly = goal.monthlyContribution ?? 1000;
  const history = goal.priceHistory ?? [base, currentPrice];
  const drift = Math.round(((currentPrice - base) / base) * 100);
  const remaining = Math.max(0, currentPrice - goal.current);
  const monthsToGoal = Math.ceil(remaining / Math.max(1, monthly));
  const eta = new Date();
  eta.setMonth(eta.getMonth() + monthsToGoal);
  const etaLabel = eta.toLocaleDateString("tr-TR", { month: "short", year: "numeric" });
  const pct = Math.min(100, (goal.current / currentPrice) * 100);

  // Sparkline
  const w = 280, h = 60;
  const min = Math.min(...history), max = Math.max(...history);
  const span = max - min || 1;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x},${y}`;
  }).join(" ");

  // Scenarios (PBI 6)
  const scenarios = [
    { label: "Mevcut plan", monthly, eta: monthsToGoal },
    { label: "+%20 katkı", monthly: Math.round(monthly * 1.2), eta: Math.ceil(remaining / (monthly * 1.2)) },
    { label: "Hızlı (2x)", monthly: monthly * 2, eta: Math.ceil(remaining / (monthly * 2)) },
  ];

  return (
    <PhoneShell title={goal.name} back>
      {/* Price alert (PBI 9) */}
      {drift >= 5 && (
        <div className="ny-card mb-4 border-amber-300/60 bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-amber-900">Hedefin fiyatı arttı</div>
              <p className="text-xs text-amber-800 mt-1">
                {fmt(base)} → <b>{fmt(currentPrice)}</b> (+%{drift}). {goal.autoUpdate ? "Tasarruf planın otomatik güncellendi." : "Planı güncellemek ister misin?"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress (PBI 8) */}
      <div className="ny-tile-dark mb-4">
        <div className="ny-eyebrow text-white/60">İlerleme</div>
        <div className="flex items-end gap-2 mt-2">
          <div className="text-3xl font-semibold tracking-tight">{fmt(goal.current)}</div>
          <div className="text-sm text-white/60 mb-1">/ {fmt(currentPrice)}</div>
        </div>
        <div className="h-2 bg-white/15 rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-[hsl(var(--primary-on-dark))]" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-white/70">
          <span>%{Math.round(pct)} tamamlandı</span>
          <span>Tahmini: {etaLabel}</span>
        </div>
      </div>

      {/* Price tracker (PBI 3) */}
      <div className="ny-card mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="ny-eyebrow">Güncel fiyat</div>
            <div className="text-lg font-semibold mt-1">{fmt(currentPrice)}</div>
          </div>
          <div className={`text-sm font-semibold ${drift > 0 ? "text-amber-600" : "text-primary"}`}>
            {drift > 0 ? "+" : ""}%{drift}
          </div>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14">
          <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" points={pts} />
        </svg>
        <div className="text-xs opacity-60 mt-1">Son 7 ay fiyat değişimi</div>
      </div>

      {/* Inflation (PBI 4) */}
      <div className="ny-card mb-4">
        <div className="flex items-center justify-between">
          <div className="ny-eyebrow">Beklenen yıllık enflasyon</div>
          <div className="font-semibold text-sm">%{inflation}</div>
        </div>
        <input
          type="range" min={0} max={80} value={inflation}
          onChange={(e) => updateGoal(goal.id, { inflationPct: +e.target.value })}
          className="w-full mt-3 accent-[hsl(var(--primary))]"
        />
        <div className="text-xs opacity-60 mt-1">
          Hedef değeri yıllık %{inflation} artışla yeniden hesaplanır.
        </div>
      </div>

      {/* ETA + scenarios (PBI 5, 6) */}
      <div className="ny-card mb-4">
        <div className="ny-eyebrow mb-3">Tasarruf senaryoları</div>
        <div className="space-y-2">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              onClick={() => updateGoal(goal.id, { monthlyContribution: s.monthly })}
              className={`w-full flex items-center justify-between rounded-xl p-3 border ${
                s.monthly === monthly ? "border-primary bg-primary/5" : "border-[hsl(var(--hairline))]"
              }`}
            >
              <div className="text-left">
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs opacity-60">{fmt(s.monthly)} / ay</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{s.eta} ay</div>
                <div className="text-xs opacity-60">{i === 0 ? "tahmini" : `${monthsToGoal - s.eta} ay erken`}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Checkpoints (PBI 7) */}
      <div className="ny-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="ny-eyebrow">Checkpoint bildirimleri</div>
          <span className="text-xs opacity-60">{goal.checkpoints?.filter((c) => pct >= c.pct).length ?? 0} ulaşıldı</span>
        </div>
        <div className="space-y-2">
          {(goal.checkpoints ?? []).map((c) => {
            const reached = pct >= c.pct;
            return (
              <div key={c.pct} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${reached ? "bg-primary text-white" : "bg-[hsl(var(--divider-soft))]"}`}>
                  {reached ? <Check size={14} /> : <span className="text-[10px] font-semibold">%{c.pct}</span>}
                </div>
                <div className="flex-1 text-sm">{c.label}</div>
                <div className="text-xs opacity-60">{reached ? "bildirildi" : "bekliyor"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-update plan (PBI 10) */}
      <div className="ny-card mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">Tasarruf planını otomatik güncelle</div>
          <p className="text-xs opacity-60 mt-1">Fiyat değişince aylık katkın yeniden hesaplanır.</p>
        </div>
        <button
          onClick={() => updateGoal(goal.id, { autoUpdate: !goal.autoUpdate })}
          className={`w-12 h-7 rounded-full relative transition ${goal.autoUpdate ? "bg-primary" : "bg-[hsl(var(--divider-soft))]"}`}
          aria-label="Otomatik güncelle"
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${goal.autoUpdate ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* AI Coach (PBI 11) */}
      <button
        onClick={() => { updateGoal(goal.id, { coachContext: goal.name }); go("chatbot"); }}
        className="ny-pill w-full flex items-center justify-center gap-2"
      >
        <Sparkles size={16} /> AI Tasarruf Koçu ile konuş
      </button>
    </PhoneShell>
  );
}

/* 9. HISTORY */
export function History() {
  const items = [
    { m: "Mayıs 2026", op: 2450, acc: 750, dec: 8 },
    { m: "Nisan 2026", op: 2120, acc: 620, dec: 6 },
    { m: "Mart 2026", op: 1890, acc: 540, dec: 5 },
    { m: "Şubat 2026", op: 2300, acc: 700, dec: 7 },
  ];
  return (
    <PhoneShell title="Geçmiş analizler" back>
      <p className="ny-tagline mb-4">Yakaladığın fırsatlar ve kararların.</p>
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.m} className="ny-card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{i.m}</div>
              <div className="text-primary font-semibold">+{fmt(i.acc)}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
              <div><div className="opacity-60">Fırsat</div><div className="font-semibold text-sm">{fmt(i.op)}</div></div>
              <div><div className="opacity-60">Katkı</div><div className="font-semibold text-sm">{fmt(i.acc)}</div></div>
              <div><div className="opacity-60">Karar</div><div className="font-semibold text-sm">{i.dec}</div></div>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

/* 10. SCORE */
export function Score() {
  const factors = [
    { name: "Düzenli katkı", v: 80 },
    { name: "Hedefe bağlılık", v: 65 },
    { name: "Harcama azaltma", v: 60 },
    { name: "Katkı sürekliliği", v: 70 },
  ];
  return (
    <PhoneShell title="Gelecek Skoru" back>
      <div className="ny-tile-dark mb-5 text-center py-8">
        <div className="text-white/60 text-xs uppercase tracking-wider">Skorun</div>
        <div className="text-[88px] leading-none font-semibold ny-tight mt-2">68</div>
        <div className="text-white/60 mt-2">üzerinden 100</div>
        <div className="inline-flex items-center gap-1 text-[hsl(var(--primary-on-dark))] mt-3 text-sm"><TrendingUp size={14} /> Geçen aydan +4</div>
      </div>
      <p className="ny-tagline mb-4">Skorun seni cezalandırmak için değil, motive etmek için var.</p>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.name} className="ny-card">
            <div className="flex justify-between text-sm mb-2"><span>{f.name}</span><span className="font-semibold">{f.v}%</span></div>
            <div className="h-2 bg-[hsl(var(--divider-soft))] rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${f.v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

/* 11. FUNDS */
export function Funds() {
  const funds = [
    { name: "Düşük risk", desc: "Sermaye koruma odaklı", ret: "%8–12" },
    { name: "Dengeli", desc: "Risk ve büyüme dengesi", ret: "%12–18" },
    { name: "Büyüme odaklı", desc: "Uzun vadeli büyüme", ret: "%18–28" },
  ];
  return (
    <PhoneShell title="Fon seçenekleri" back>
      <div className="ny-card mb-4 flex gap-3">
        <Info size={18} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs">Bu yatırım tavsiyesi değildir. Karar tamamen sana aittir.</p>
      </div>
      <div className="space-y-3">
        {funds.map((f) => (
          <div key={f.name} className="ny-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-lg">{f.name}</div>
                <div className="text-sm opacity-60">{f.desc}</div>
              </div>
              <div className="text-right">
                <div className="ny-eyebrow">Beklenen</div>
                <div className="text-primary font-semibold">{f.ret}</div>
              </div>
            </div>
            <button className="ny-pill-sm mt-4">Detayı gör</button>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}

/* 12. NOTIFICATIONS — with per-category thresholds */
export function Notifications() {
  const { notificationsEnabled, toggleNotifications, go, thresholds, setThreshold } = useApp();
  const items = [
    { t: "Hedefe yaklaşıyorsun", d: "Emeklilik hedefinin %7'sine ulaştın." },
    { t: "Kahve uyarısı", d: "Bu ay kahve harcaman ortalamayı geçmek üzere." },
    { t: "Maaş günü", d: "Yarın 1.000 ₺ otomatik katkı yapılacak." },
  ];
  const cats = categories.filter((c) => c.reducible);
  return (
    <PhoneShell title="Bildirimler">
      <div className="ny-card mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">Bildirim izinleri</div>
          <div className="text-xs opacity-60">İstediğin zaman kapatabilirsin</div>
        </div>
        <button
          onClick={toggleNotifications}
          className={`w-11 h-7 rounded-full p-0.5 ${notificationsEnabled ? "bg-primary" : "bg-[hsl(var(--divider-soft))]"}`}
        >
          <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${notificationsEnabled ? "translate-x-4" : ""}`} />
        </button>
      </div>

      <div className="ny-eyebrow mb-2">Son bildirimler</div>
      <div className="space-y-3 mb-5">
        {items.map((i) => (
          <div key={i.t} className="ny-card">
            <div className="font-semibold">{i.t}</div>
            <div className="text-sm opacity-70 mt-1">{i.d}</div>
          </div>
        ))}
      </div>

      <div className="ny-eyebrow mb-2">Kategori uyarı eşikleri</div>
      <div className="space-y-3 mb-5">
        {cats.map((c) => {
          const v = thresholds[c.id] ?? c.avg;
          return (
            <div key={c.id} className="ny-card">
              <div className="flex justify-between mb-2">
                <span className="text-sm">{c.icon} {c.name}</span>
                <span className="text-primary font-semibold text-sm">{fmt(v)}</span>
              </div>
              <input
                type="range" min={100} max={6000} step={50} value={v}
                onChange={(e) => setThreshold(c.id, +e.target.value)}
                className="w-full accent-[hsl(var(--primary))]"
              />
              <p className="text-xs opacity-60 mt-1">Bu tutara yaklaştığında uyarılacaksın.</p>
            </div>
          );
        })}
      </div>

      <button onClick={() => go("pause")} className="text-primary text-sm w-full">Nefes ayı ayarla →</button>
    </PhoneShell>
  );
}

/* 13. SUBSCRIPTIONS — with savings summary */
export function Subscriptions() {
  const initial = Object.fromEntries(subscriptions.map((s) => [s.id, s.status])) as Record<string, "active" | "cancellable">;
  const [marks, setMarks] = useState<Record<string, "active" | "cancellable">>(initial);
  const cancellable = subscriptions.filter((s) => marks[s.id] === "cancellable");
  const monthly = cancellable.reduce((sum, s) => sum + s.amount, 0);
  return (
    <PhoneShell title="Abonelikler" back>
      <p className="ny-tagline mb-4">Düzenli ödemelerini gözden geçir.</p>

      <div className="ny-tile-dark mb-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">İptal edilebilir tasarruf</div>
        <div className="text-3xl font-semibold mt-1 ny-tight">{fmt(monthly)}<span className="text-base text-white/60"> /ay</span></div>
        <div className="text-white/60 text-sm mt-1">Yıllık {fmt(monthly * 12)}</div>
      </div>

      <div className="space-y-3">
        {subscriptions.map((s) => {
          const m = marks[s.id];
          return (
            <div key={s.id} className="ny-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs opacity-60">{s.freq} · {fmt(s.amount)}</div>
                </div>
                {m === "cancellable" && <span className="text-xs text-primary font-semibold">İptal edilebilir</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setMarks((x) => ({ ...x, [s.id]: "active" }))}
                  className={`ny-chip flex-1 justify-center ${m === "active" ? "border-primary text-primary" : ""}`}
                >Kullanıyorum</button>
                <button
                  onClick={() => setMarks((x) => ({ ...x, [s.id]: "cancellable" }))}
                  className={`ny-chip flex-1 justify-center ${m === "cancellable" ? "border-primary text-primary" : ""}`}
                >İptal edilebilir</button>
              </div>
            </div>
          );
        })}
      </div>
    </PhoneShell>
  );
}

/* 14. PAUSE */
export function PauseScreen() {
  const { paused, setPaused, go } = useApp();
  const [months, setMonths] = useState(1);
  return (
    <PhoneShell title="Nefes ayı" back>
      <div className="ny-tile-dark mb-4">
        <Pause size={28} />
        <div className="font-semibold text-lg mt-2">{paused ? "Katkıların duraklatıldı" : "Katkıları geçici duraklat"}</div>
        <div className="text-white/70 text-sm mt-1">Maddi olarak zorlandığında baskı hissetmeden ara verebilirsin.</div>
      </div>
      {!paused && (
        <div className="ny-card mb-4">
          <div className="ny-eyebrow mb-2">Süre</div>
          <div className="flex gap-2">
            {[1, 2, 3, 6].map((m) => (
              <button key={m} onClick={() => setMonths(m)} className={`ny-chip flex-1 justify-center ${months === m ? "border-primary text-primary" : ""}`}>
                {m} ay
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => { setPaused(!paused); go("dashboard"); }}
        className="ny-pill w-full"
      >
        {paused ? "Katkıları sürdür" : `${months} ay duraklat`}
      </button>
      <p className="text-xs opacity-60 text-center mt-3">İstediğin an aktif edebilirsin.</p>
    </PhoneShell>
  );
}

/* 15. CIRCLES — with create form */
export function Circles() {
  const { circles, addCircle } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState(50000);
  return (
    <PhoneShell title="Birikim Çemberleri" back rightSlot={
      <button onClick={() => setCreating(true)} className="text-primary"><Plus size={20} /></button>
    }>
      <p className="ny-tagline mb-4">Ailen veya topluluğunla ortak hedef.</p>

      <div className="space-y-4">
        {circles.map((c) => {
          const total = c.members.reduce((s, m) => s + m.a, 0);
          const pct = (total / c.target) * 100;
          return (
            <div key={c.id} className="ny-tile-dark">
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wider"><Users size={14} /> {c.name}</div>
              <div className="text-3xl font-semibold mt-2 ny-tight">{fmt(total)}</div>
              <div className="text-white/60 text-sm mt-1">Hedef: {fmt(c.target)}</div>
              <div className="h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[hsl(var(--primary-on-dark))]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 space-y-2">
                {c.members.map((m) => (
                  <div key={m.n} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">{m.n[0]}</div>
                      <span>{m.n}</span>
                    </div>
                    <span className="text-[hsl(var(--primary-on-dark))]">{fmt(m.a)}</span>
                  </div>
                ))}
              </div>
              <button className="ny-pill-sm mt-4">Davet et</button>
            </div>
          );
        })}
      </div>

      {creating && (
        <div className="ny-card mt-5">
          <div className="ny-eyebrow mb-3">Yeni çember</div>
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Çember adı (ör. Tatil 2027)"
            className="w-full bg-[hsl(var(--canvas-parchment))] rounded-xl p-3 text-sm border border-[hsl(var(--hairline))] mb-3"
          />
          <input
            type="number" value={target} onChange={(e) => setTarget(+e.target.value)} placeholder="Hedef tutar"
            className="w-full bg-[hsl(var(--canvas-parchment))] rounded-xl p-3 text-sm border border-[hsl(var(--hairline))] mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { if (name) { addCircle({ name, target }); setName(""); setCreating(false); } }}
              className="ny-pill flex-1"
            >Oluştur</button>
            <button onClick={() => setCreating(false)} className="ny-pill-ghost flex-1">İptal</button>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}

/* 16. LEARN */
export function Learn() {
  const items = [
    { t: "BES nedir?", d: "Bireysel emeklilik sisteminin temelleri." },
    { t: "Devlet katkısı nasıl işler?", d: "%30 devlet katkısının basit anlatımı." },
    { t: "Fon türleri", d: "Hisse, borçlanma, altın ve karma fonlar." },
    { t: "Mikro birikim mantığı", d: "Küçük tutarların büyük etkisi." },
  ];
  return (
    <PhoneShell title="Öğren" back>
      <p className="ny-tagline mb-4">Tarafsız, kısa ve sade içerikler.</p>
      <div className="space-y-3">
        {items.map((i) => (
          <button key={i.t} className="ny-card w-full text-left flex gap-3 items-start">
            <BookOpen size={20} className="text-primary mt-1 shrink-0" />
            <div>
              <div className="font-semibold">{i.t}</div>
              <div className="text-sm opacity-70 mt-1">{i.d}</div>
            </div>
          </button>
        ))}
      </div>
    </PhoneShell>
  );
}

/* 17. CHATBOT */
export function Chatbot() {
  const { goals, selectedGoalId } = useApp();
  const goal = goals.find((g) => g.id === selectedGoalId);
  const intro = goal
    ? `Merhaba 👋 "${goal.name}" hedefin için buradayım. Şu an ${fmt(goal.current)} biriktirdin, hedef ${fmt(goal.currentPrice ?? goal.target)}. Birlikte plan yapalım mı?`
    : "Merhaba Deniz 👋 Tasarruf hedeflerini birlikte çalışalım. En çok hangi kategoride zorlanıyorsun?";
  const [msgs, setMsgs] = useState<{ who: string; t: string }[]>([{ who: "bot", t: intro }]);
  const [t, setT] = useState("");
  const send = (txt?: string) => {
    const msg = (txt ?? t).trim();
    if (!msg) return;
    setMsgs((m) => [...m, { who: "me", t: msg }]);
    setT("");
    setTimeout(() => {
      const reply = goal
        ? `"${goal.name}" için aylık ${fmt(goal.monthlyContribution ?? 1000)} katkıyla mevcut tempoda ilerliyorsun. Katkıyı %20 artırırsak hedefe birkaç ay erken ulaşabilirsin. Karar tamamen sana ait — finansal tavsiye değildir.`
        : "Bu kategoride aylık ortalamana göre küçük bir hedef belirleyebiliriz. Örneğin haftada 2 günü farklı planla; oluşan farkı mikro katkıya aktaralım. Karar tamamen sana ait — finansal tavsiye değildir.";
      setMsgs((m) => [...m, { who: "bot", t: reply }]);
    }, 700);
  };
  const quick = goal
    ? ["Hedefe nasıl daha hızlı ulaşırım?", "Aylık katkımı artır", "Enflasyon etkisi nedir?"]
    : ["Kahve", "Dışarı yemek", "Online alışveriş"];
  return (
    <PhoneShell title="Tasarruf Asistanı">
      <div className="space-y-3 pb-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.who === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 text-sm rounded-2xl ${
                m.who === "me" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-[hsl(var(--canvas-parchment))] rounded-bl-md"
              }`}
            >
              {m.t}
            </div>
          </div>
        ))}
        {msgs.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quick.map((q) => (
              <button key={q} onClick={() => send(q)} className="ny-chip">{q}</button>
            ))}
          </div>
        )}
      </div>
      <div className="absolute left-0 right-0 bottom-[64px] px-4">
        <div className="flex gap-2 bg-white/95 backdrop-blur-xl border border-[hsl(var(--hairline))] rounded-full p-1.5">
          <input
            value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Bir soru yaz…"
            className="flex-1 bg-transparent outline-none px-3 text-sm"
          />
          <button onClick={() => send()} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center"><Send size={16} /></button>
        </div>
      </div>
    </PhoneShell>
  );
}

/* 18. DEMO RESULT — with share */
export function DemoResult() {
  const { go } = useApp();
  const [shared, setShared] = useState(false);
  const share = async () => {
    const text = "Niyet ile yıllık 29.400 ₺ mikro katkı potansiyelim var. Sen de dene!";
    try {
      if (navigator.share) await navigator.share({ title: "Niyet özetim", text });
      else { await navigator.clipboard.writeText(text); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch {}
  };
  return (
    <PhoneShell dark hideTabs scroll>
      <div className="pt-6 pb-6 flex items-start justify-between">
        <div>
          <div className="ny-eyebrow text-white/60">Demo özeti</div>
          <h1 className="text-[34px] leading-tight font-semibold ny-tight mt-2">Niyet'le geleceğin böyle görünebilir.</h1>
        </div>
        <button onClick={share} className="ny-chip !bg-white/10 !border-white/20 text-white shrink-0 mt-2">
          <Share2 size={14} className="mr-1" /> {shared ? "Kopyalandı" : "Paylaş"}
        </button>
      </div>
      <div className="space-y-3">
        <div className="bg-white/5 rounded-[18px] p-5">
          <div className="text-white/60 text-xs uppercase tracking-wider">Aylık mikro katkı potansiyeli</div>
          <div className="text-4xl font-semibold mt-2 ny-tight">2.450 ₺</div>
        </div>
        <div className="bg-white/5 rounded-[18px] p-5">
          <div className="text-white/60 text-xs uppercase tracking-wider">Yıllık potansiyel</div>
          <div className="text-4xl font-semibold mt-2 ny-tight">29.400 ₺</div>
        </div>
        <div className="bg-white/5 rounded-[18px] p-5">
          <div className="text-white/60 text-xs uppercase tracking-wider">Gelecek Skoru artışı</div>
          <div className="text-4xl font-semibold mt-2 ny-tight text-[hsl(var(--primary-on-dark))]">+12</div>
        </div>
        <div className="bg-white/5 rounded-[18px] p-5">
          <div className="text-white/60 text-xs uppercase tracking-wider">En yüksek fırsatlar</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span>🍽 Dışarı yemek</span><span className="text-[hsl(var(--primary-on-dark))]">+900 ₺</span></li>
            <li className="flex justify-between"><span>🛍 Online alışveriş</span><span className="text-[hsl(var(--primary-on-dark))]">+700 ₺</span></li>
            <li className="flex justify-between"><span>☕ Kahve</span><span className="text-[hsl(var(--primary-on-dark))]">+300 ₺</span></li>
          </ul>
        </div>
      </div>
      <div className="space-y-3 mt-6 pb-6">
        <button className="ny-pill w-full" onClick={() => go("connect")}>Gerçek hesabımı bağla</button>
        <button className="ny-pill-ghost w-full text-white border-white/40" onClick={() => go("dashboard")}>Demo'ya dön</button>
      </div>
    </PhoneShell>
  );
}

/* 19. SETTINGS */
export function SettingsScreen() {
  const { connected, setConnected, go, paused, notificationsEnabled, toggleNotifications } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <PhoneShell title="Ayarlar" back>
      <div className="ny-card mb-3">
        <div className="ny-eyebrow mb-3">Profil</div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--canvas-parchment))] flex items-center justify-center font-semibold">D</div>
          <div>
            <div className="font-semibold">Deniz</div>
            <div className="text-xs opacity-60">26 · Genç profesyonel</div>
          </div>
        </div>
      </div>

      <Row label="Bildirimler" value={notificationsEnabled ? "Açık" : "Kapalı"} onClick={toggleNotifications} />
      <Row label="Nefes ayı" value={paused ? "Aktif" : "Kapalı"} onClick={() => go("pause")} />
      <Row label="Hesap bağlantısı" value={connected ? "Bağlı" : "Bağlı değil"} onClick={() => connected ? setConfirm(true) : go("connect")} />

      <div className="ny-eyebrow mt-5 mb-2">Yasal</div>
      <Row label="Gizlilik" value="" onClick={() => {}} />
      <Row label="Kullanım koşulları" value="" onClick={() => {}} />

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-[hsl(var(--canvas))] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6">
            <div className="font-semibold text-lg">Bağlantıyı kes?</div>
            <p className="text-sm opacity-70 mt-2">Tüm finansal verilerin silinir. İstediğin zaman yeniden bağlayabilirsin.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirm(false)} className="ny-pill-ghost flex-1">Vazgeç</button>
              <button
                onClick={() => { setConnected(false); setConfirm(false); }}
                className="ny-pill flex-1 !bg-[hsl(var(--destructive))]"
              >Bağlantıyı kes</button>
            </div>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="ny-card w-full flex items-center justify-between mb-2">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-2 text-sm opacity-60">{value}<ChevronRight size={16} /></span>
    </button>
  );
}
