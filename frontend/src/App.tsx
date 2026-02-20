import { useState } from "react";
import { NavBar } from "./components/layout/NavBar";
import { StatusBar } from "./components/layout/StatusBar";
import { Footer } from "./components/layout/Footer";
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
      <Footer />
    </div>
  );
}
