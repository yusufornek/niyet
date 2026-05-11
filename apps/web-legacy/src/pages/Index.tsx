import { useApp } from "@/store/useApp";
import {
  Onboarding, Consent, Connect, Dashboard, Radar, Category, Rule, Goals, GoalDetail,
  History, Score, Funds, Notifications, Subscriptions, PauseScreen, Circles,
  Learn, Chatbot, DemoResult, SettingsScreen,
} from "@/screens";

const Index = () => {
  const screen = useApp((s) => s.screen);
  const map = {
    onboarding: <Onboarding />,
    consent: <Consent />,
    connect: <Connect />,
    dashboard: <Dashboard />,
    radar: <Radar />,
    category: <Category />,
    rule: <Rule />,
    goals: <Goals />,
    goalDetail: <GoalDetail />,
    history: <History />,
    score: <Score />,
    funds: <Funds />,
    notifications: <Notifications />,
    subscriptions: <Subscriptions />,
    pause: <PauseScreen />,
    circles: <Circles />,
    learn: <Learn />,
    chatbot: <Chatbot />,
    demoResult: <DemoResult />,
    settings: <SettingsScreen />,
  } as const;
  return map[screen];
};

export default Index;
