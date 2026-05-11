import { ReactNode } from "react";
import { useApp } from "@/store/useApp";
import { ChevronLeft, Bell, Home, BarChart3, Target, MessageCircle } from "lucide-react";

type Props = {
  title?: string;
  children: ReactNode;
  back?: boolean;
  dark?: boolean;
  scroll?: boolean;
  hideTabs?: boolean;
  rightSlot?: ReactNode;
};

export default function PhoneShell({ title, children, back, dark, scroll = true, hideTabs, rightSlot }: Props) {
  const { back: goBack, go, screen } = useApp();

  return (
    <div className="min-h-screen flex items-start justify-center bg-[hsl(var(--canvas-parchment))] py-0 sm:py-8">
      <div
        className={`relative w-full sm:w-[390px] sm:h-[844px] sm:rounded-[44px] sm:border sm:border-black/10 overflow-hidden flex flex-col ${
          dark ? "bg-[hsl(var(--tile-1))] text-[hsl(var(--body-on-dark))]" : "bg-[hsl(var(--canvas))] text-foreground"
        }`}
        style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.25)" }}
      >
        {/* Status bar */}
        <div className={`flex items-center justify-between px-6 pt-3 pb-1 text-[12px] ${dark ? "text-white/80" : "text-foreground/70"}`}>
          <span>9:41</span>
          <span className="font-semibold tracking-tight">Niyet</span>
          <span>●●●●</span>
        </div>

        {/* Header */}
        {(title || back) && (
          <div className={`px-5 pt-2 pb-3 flex items-center gap-2 ${dark ? "border-white/10" : "border-[hsl(var(--hairline))]"} `}>
            {back && (
              <button
                onClick={goBack}
                className={`-ml-2 p-1 rounded-full ${dark ? "hover:bg-white/10" : "hover:bg-black/5"}`}
                aria-label="Geri"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {title && <h1 className="ny-h2 flex-1 truncate">{title}</h1>}
            {rightSlot}
          </div>
        )}

        <div className={`flex-1 ${scroll ? "overflow-y-auto" : "overflow-hidden"} px-5 pb-28`}>{children}</div>

        {/* Bottom tab bar */}
        {!hideTabs && (
          <nav
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-around py-3 px-4 ${
              dark ? "bg-black/40 backdrop-blur-xl border-t border-white/10" : "bg-white/80 backdrop-blur-xl border-t border-[hsl(var(--hairline))]"
            }`}
          >
            <TabBtn icon={<Home size={20} />} label="Ana" active={screen === "dashboard"} onClick={() => go("dashboard")} />
            <TabBtn icon={<BarChart3 size={20} />} label="Radar" active={screen === "radar"} onClick={() => go("radar")} />
            <TabBtn icon={<Target size={20} />} label="Hedefler" active={screen === "goals"} onClick={() => go("goals")} />
            <TabBtn icon={<MessageCircle size={20} />} label="Asistan" active={screen === "chatbot"} onClick={() => go("chatbot")} />
            <TabBtn icon={<Bell size={20} />} label="Bildirim" active={screen === "notifications"} onClick={() => go("notifications")} />
          </nav>
        )}
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 px-2">
      <span className={active ? "text-primary" : "opacity-60"}>{icon}</span>
      <span className={`text-[10px] ${active ? "text-primary font-semibold" : "opacity-60"}`}>{label}</span>
    </button>
  );
}
