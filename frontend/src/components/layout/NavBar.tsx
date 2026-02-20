import type React from "react";
import { Cloud, Sprout, BarChart2 } from "lucide-react";

type Tab = "dashboard" | "charts" | "planting";

interface NavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", Icon: Cloud },
    { id: "charts", label: "Charts", Icon: BarChart2 },
    { id: "planting", label: "Planting", Icon: Sprout },
  ];

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <Cloud className="h-6 w-6 text-sky-400" />
        <span className="font-bold text-lg tracking-tight">UnderTheWx</span>
        <span className="text-xs text-gray-500 ml-1">Lindon, UT · 4,623 ft</span>
      </div>
      <div className="flex items-center gap-1">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-sky-900/60 text-sky-300"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
