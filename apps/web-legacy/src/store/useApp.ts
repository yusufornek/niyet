import { create } from "zustand";

export type ScreenId =
  | "onboarding"
  | "consent"
  | "connect"
  | "dashboard"
  | "radar"
  | "category"
  | "rule"
  | "goals"
  | "goalDetail"
  | "history"
  | "score"
  | "funds"
  | "notifications"
  | "subscriptions"
  | "pause"
  | "circles"
  | "learn"
  | "chatbot"
  | "demoResult"
  | "settings";

const TAB_SCREENS: ScreenId[] = ["dashboard", "radar", "goals", "chatbot", "notifications"];

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  date: string;
  basePrice?: number;
  currentPrice?: number;
  inflationPct?: number;
  monthlyContribution?: number;
  priceHistory?: number[];
  checkpoints?: { pct: number; label: string; reached: boolean }[];
  autoUpdate?: boolean;
  coachContext?: string;
};

type State = {
  screen: ScreenId;
  history: ScreenId[];
  notificationsEnabled: boolean;
  paused: boolean;
  connected: boolean;
  acceptedSavings: number;
  rules: { id: string; label: string; amount: string; freq: string }[];
  goals: Goal[];
  circles: { id: string; name: string; target: number; members: { n: string; a: number }[] }[];
  thresholds: Record<string, number>;
  selectedCategoryId: string | null;
  selectedGoalId: string | null;
  go: (s: ScreenId) => void;
  back: () => void;
  toggleNotifications: () => void;
  setPaused: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  acceptSaving: (n: number) => void;
  addRule: (r: { label: string; amount: string; freq: string }) => void;
  addGoal: (g: Partial<Goal> & { name: string; target: number; date: string }) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  selectGoal: (id: string | null) => void;
  addCircle: (c: { name: string; target: number }) => void;
  setThreshold: (cat: string, v: number) => void;
  selectCategory: (id: string) => void;
};

export const useApp = create<State>((set) => ({
  screen: "onboarding",
  history: [],
  notificationsEnabled: true,
  paused: false,
  connected: true,
  acceptedSavings: 0,
  rules: [
    { id: "r1", label: "Haftalık mikro katkı", amount: "250 ₺", freq: "Haftalık" },
    { id: "r2", label: "Maaş günü katkısı", amount: "1.000 ₺", freq: "Aylık" },
  ],
  goals: [
    {
      id: "g1",
      name: "Emeklilik birikimi",
      target: 250000,
      current: 18400,
      date: "2045",
      basePrice: 250000,
      currentPrice: 268500,
      inflationPct: 32,
      monthlyContribution: 1250,
      priceHistory: [240000, 244000, 251000, 256000, 260000, 263000, 268500],
      checkpoints: [
        { pct: 10, label: "İlk %10", reached: false },
        { pct: 25, label: "Çeyrek yol", reached: false },
        { pct: 50, label: "Yarı yol", reached: false },
        { pct: 75, label: "Son düzlük", reached: false },
      ],
      autoUpdate: true,
    },
  ],
  circles: [
    { id: "c1", name: "Aile birikimi", target: 50000, members: [
      { n: "Deniz", a: 4200 },
      { n: "Ayşe", a: 3800 },
      { n: "Mert", a: 2900 },
    ] },
  ],
  thresholds: { coffee: 1000, dining: 4000, shopping: 3000 },
  selectedCategoryId: null,
  selectedGoalId: "g1",
  go: (s) =>
    set((st) => {
      if (TAB_SCREENS.includes(s)) return { screen: s, history: [] };
      return { screen: s, history: [...st.history, st.screen] };
    }),
  back: () =>
    set((st) => {
      const h = [...st.history];
      const prev = h.pop();
      return { screen: prev ?? "dashboard", history: h };
    }),
  toggleNotifications: () => set((s) => ({ notificationsEnabled: !s.notificationsEnabled })),
  setPaused: (v) => set({ paused: v }),
  setConnected: (v) => set({ connected: v }),
  acceptSaving: (n) => set((s) => ({ acceptedSavings: s.acceptedSavings + n })),
  addRule: (r) => set((s) => ({ rules: [...s.rules, { id: Math.random().toString(36).slice(2), ...r }] })),
  addGoal: (g) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({
      goals: [
        ...s.goals,
        {
          id,
          current: 0,
          basePrice: g.target,
          currentPrice: g.target,
          inflationPct: 28,
          monthlyContribution: Math.max(250, Math.round(g.target / 120)),
          priceHistory: [g.target * 0.94, g.target * 0.96, g.target * 0.98, g.target],
          checkpoints: [
            { pct: 10, label: "İlk %10", reached: false },
            { pct: 25, label: "Çeyrek yol", reached: false },
            { pct: 50, label: "Yarı yol", reached: false },
            { pct: 75, label: "Son düzlük", reached: false },
          ],
          autoUpdate: true,
          ...g,
        },
      ],
      selectedGoalId: id,
    }));
    return id;
  },
  updateGoal: (id, patch) =>
    set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
  selectGoal: (id) => set({ selectedGoalId: id }),
  addCircle: (c) =>
    set((s) => ({
      circles: [
        ...s.circles,
        { id: Math.random().toString(36).slice(2), name: c.name, target: c.target, members: [{ n: "Deniz", a: 0 }] },
      ],
    })),
  setThreshold: (cat, v) => set((s) => ({ thresholds: { ...s.thresholds, [cat]: v } })),
  selectCategory: (id) => set({ selectedCategoryId: id }),
}));

export const categories = [
  { id: "coffee", name: "Kahve", icon: "☕", spent: 1250, opportunity: 300, reducible: true, avg: 1100 },
  { id: "dining", name: "Dışarı yemek", icon: "🍽", spent: 4800, opportunity: 900, reducible: true, avg: 4200 },
  { id: "subs", name: "Abonelikler", icon: "📺", spent: 620, opportunity: 250, reducible: true, avg: 620 },
  { id: "shopping", name: "Online alışveriş", icon: "🛍", spent: 3400, opportunity: 700, reducible: true, avg: 3000 },
  { id: "transport", name: "Ulaşım", icon: "🚇", spent: 1100, opportunity: 0, reducible: false, avg: 1100 },
];

export const subscriptions = [
  { id: "s1", name: "Netflix", amount: 199, freq: "Aylık", status: "active" },
  { id: "s2", name: "Spotify", amount: 84, freq: "Aylık", status: "active" },
  { id: "s3", name: "Gym Plus", amount: 220, freq: "Aylık", status: "cancellable" },
  { id: "s4", name: "Bulut depolama", amount: 117, freq: "Aylık", status: "cancellable" },
];
