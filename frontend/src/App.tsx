import { useState } from "react";
import { NavBar } from "./components/layout/NavBar";
import { StatusBar } from "./components/layout/StatusBar";
import { WeatherDashboard } from "./components/dashboard/WeatherDashboard";
import { WeatherChart } from "./components/charts/WeatherChart";
import { PlantingCalendar } from "./components/planting/PlantingCalendar";

type Tab = "dashboard" | "charts" | "planting";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar activeTab={tab} onTabChange={setTab} />
      <StatusBar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {tab === "dashboard" && <WeatherDashboard />}
        {tab === "charts" && <WeatherChart />}
        {tab === "planting" && <PlantingCalendar />}
      </main>
      <footer className="text-center text-xs text-gray-700 py-3 border-t border-gray-900">
        UnderTheWx · Spanish Fork, UT · 40.333°N 111.728°W · 4,623 ft ASL · Zone 6b-7a
      </footer>
    </div>
  );
}
