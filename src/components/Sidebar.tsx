"use client";

import React from "react";
import {
  LayoutDashboard,
  Search,
  Layers,
  Database,
  Settings,
  ChevronDown,
  UserCheck,
} from "lucide-react";

export type TabType = "dashboard" | "scraper" | "review" | "notion-settings" | "profile";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingCount: number;
  totalCount: number;
  notionConfigured: boolean;
  geminiConfigured: boolean;
  userName?: string;
  isProfileConfirmed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  notionConfigured,
  userName = "Sparsh Shishodia",
  isProfileConfirmed = true,
}) => {
  const navItems = [
    {
      id: "dashboard" as TabType,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "scraper" as TabType,
      label: "Discover",
      icon: Search,
    },
    {
      id: "review" as TabType,
      label: "Review",
      icon: Layers,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: "profile" as TabType,
      label: "Discovery Profile",
      icon: UserCheck,
      badge: !isProfileConfirmed ? 1 : undefined,
    },
    {
      id: "notion-settings" as TabType,
      label: "Notion Sync",
      icon: Database,
    },
    {
      id: "notion-settings" as TabType,
      label: "Settings",
      icon: Settings,
    },
  ];

  const initial = userName.charAt(0).toUpperCase() || "S";

  return (
    <aside className="w-60 bg-[#F8FAFD] border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div
          onClick={() => setActiveTab("dashboard")}
          className="p-6 pb-8 flex items-center space-x-3 cursor-pointer"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1E2958] text-white shadow-sm font-semibold text-base">
            O
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight text-[#0E1738]">
              Opportunity
            </h1>
            <p className="text-[14px] font-bold tracking-tight text-[#0E1738]">
              Radar
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isSettingsItem = item.label === "Settings";
            const isActive = isSettingsItem
              ? activeTab === "notion-settings" && false
              : activeTab === item.id;

            return (
              <button
                key={`${item.label}-${idx}`}
                onClick={() => {
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                  isActive
                    ? "bg-[#DDE5FE] text-[#1E3A8A] font-semibold"
                    : "text-[#475569] hover:text-[#0F172A] hover:bg-[#EDF2F9]"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      isActive ? "text-[#1E3A8A]" : "text-[#64748B]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full font-semibold text-[11px] ${
                    item.id === "profile"
                      ? "bg-[#FFE4E6] text-[#9F1239]"
                      : "bg-[#FFD6D0] text-[#D0453B]"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Pill at Bottom */}
      <div className="p-4 border-t border-[#E2E8F0]/70">
        <div
          onClick={() => setActiveTab("profile")}
          className={`flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${
            activeTab === "profile" ? "bg-[#DDE5FE]" : "hover:bg-[#EDF2F9]"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center font-bold text-xs">
              {initial}
            </div>
            <div className="text-left">
              <span className="text-[13px] font-semibold text-[#0F172A] truncate block max-w-[125px]">
                {userName}
              </span>
              <span className="text-[10px] text-[#64748B] block">
                {isProfileConfirmed ? "Profile Active" : "Profile Incomplete"}
              </span>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
        </div>
      </div>
    </aside>
  );
};
