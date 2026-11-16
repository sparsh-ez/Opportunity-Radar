"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, MapPin, Plus, X, Globe, Building2, Check } from "lucide-react";

export interface LocationItem {
  name: string;
  region: "india" | "international";
  category: "metro_region" | "city";
  subtext?: string;
}

export const POPULAR_LOCATIONS: LocationItem[] = [
  // India Metropolitan & Tech Hubs
  { name: "Delhi NCR", region: "india", category: "metro_region", subtext: "Delhi, Noida, Gurugram, Faridabad, Ghaziabad" },
  { name: "Delhi", region: "india", category: "city", subtext: "National Capital Territory" },
  { name: "Noida", region: "india", category: "city", subtext: "Uttar Pradesh" },
  { name: "Greater Noida", region: "india", category: "city", subtext: "Uttar Pradesh" },
  { name: "Gurugram", region: "india", category: "city", subtext: "Haryana" },
  { name: "Bengaluru", region: "india", category: "city", subtext: "Karnataka" },
  { name: "Mumbai", region: "india", category: "city", subtext: "Maharashtra" },
  { name: "Hyderabad", region: "india", category: "city", subtext: "Telangana" },
  { name: "Pune", region: "india", category: "city", subtext: "Maharashtra" },
  { name: "Chennai", region: "india", category: "city", subtext: "Tamil Nadu" },
  { name: "Kolkata", region: "india", category: "city", subtext: "West Bengal" },
  { name: "Ahmedabad", region: "india", category: "city", subtext: "Gujarat" },
  { name: "Jaipur", region: "india", category: "city", subtext: "Rajasthan" },
  { name: "Lucknow", region: "india", category: "city", subtext: "Uttar Pradesh" },
  { name: "Chandigarh", region: "india", category: "city", subtext: "Punjab & Haryana" },
  { name: "Kochi", region: "india", category: "city", subtext: "Kerala" },

  // International Tech Hubs
  { name: "London", region: "international", category: "city", subtext: "United Kingdom" },
  { name: "Singapore", region: "international", category: "city", subtext: "Singapore" },
  { name: "New York", region: "international", category: "city", subtext: "United States" },
  { name: "San Francisco", region: "international", category: "city", subtext: "California, US" },
  { name: "Berlin", region: "international", category: "city", subtext: "Germany" },
  { name: "Toronto", region: "international", category: "city", subtext: "Canada" },
  { name: "Dubai", region: "international", category: "city", subtext: "United Arab Emirates" },
  { name: "Amsterdam", region: "international", category: "city", subtext: "Netherlands" },
  { name: "Sydney", region: "international", category: "city", subtext: "Australia" },
];

interface LocationAutocompleteProps {
  selectedLocations: string[];
  onChange: (locations: string[]) => void;
  placeholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  selectedLocations,
  onChange,
  placeholder = "Search cities, states, metropolitan regions...",
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanSelected = selectedLocations.filter(
    (loc) => loc.toLowerCase() !== "remote" && loc.toLowerCase() !== "online"
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSuggestions = POPULAR_LOCATIONS.filter((loc) => {
    if (!normalizedQuery) return true;
    return (
      loc.name.toLowerCase().includes(normalizedQuery) ||
      (loc.subtext && loc.subtext.toLowerCase().includes(normalizedQuery))
    );
  });

  const handleSelectLocation = (locName: string) => {
    const trimmed = locName.trim();
    if (
      trimmed &&
      trimmed.toLowerCase() !== "remote" &&
      trimmed.toLowerCase() !== "online" &&
      !cleanSelected.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      onChange([...cleanSelected, trimmed]);
    }
    setQuery("");
  };

  const handleRemoveLocation = (locName: string) => {
    onChange(cleanSelected.filter((c) => c.toLowerCase() !== locName.toLowerCase()));
  };

  const handleAddCustom = () => {
    if (
      normalizedQuery &&
      normalizedQuery !== "remote" &&
      normalizedQuery !== "online" &&
      !cleanSelected.some((c) => c.toLowerCase() === normalizedQuery)
    ) {
      handleSelectLocation(query.trim());
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Selected Location Chips */}
      {cleanSelected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cleanSelected.map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#E0564C]/10 border border-[#E0564C]/25 text-[#C84137] text-xs font-semibold shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{loc}</span>
              <button
                type="button"
                onClick={() => handleRemoveLocation(loc)}
                className="hover:bg-[#E0564C]/20 rounded-full p-0.5 transition-colors"
                title={`Remove ${loc}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input Box */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#E0564C] shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!query.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#1E2958] hover:bg-[#151D42] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center space-x-1 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Dropdown Suggestions */}
        {isOpen && (
          <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white border border-[#E2E8F0] shadow-lg divide-y divide-[#F1F5F9]">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((loc) => {
                const isSelected = cleanSelected.some(
                  (c) => c.toLowerCase() === loc.name.toLowerCase()
                );
                return (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      if (!isSelected) {
                        handleSelectLocation(loc.name);
                      } else {
                        handleRemoveLocation(loc.name);
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors hover:bg-[#F8FAFD] ${
                      isSelected ? "bg-[#FFF5F4]" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          loc.category === "metro_region"
                            ? "bg-[#E0E7FE] text-[#1E3A8A]"
                            : loc.region === "india"
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#DCFCE7] text-[#166534]"
                        }`}
                      >
                        {loc.category === "metro_region" ? (
                          <Building2 className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0E1738] flex items-center space-x-1.5">
                          <span>{loc.name}</span>
                          {loc.category === "metro_region" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#DDE5FE] text-[#1E3A8A]">
                              Region
                            </span>
                          )}
                        </div>
                        {loc.subtext && (
                          <div className="text-[11px] text-[#64748B]">{loc.subtext}</div>
                        )}
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-[#E0564C]">
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[#94A3B8]">Select</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3.5 text-center text-xs text-[#64748B]">
                <span>No pre-populated match for &ldquo;{query}&rdquo;. Click </span>
                <span className="font-bold text-[#1E2958]">Add</span>
                <span> to include it as a custom location.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popular Quick Add Pills */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-semibold text-[#64748B] flex items-center space-x-1">
          <span>Popular tech regions:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Delhi NCR", "Bengaluru", "Mumbai", "Hyderabad", "Pune", "London", "San Francisco"].map(
            (city) => {
              const isSelected = cleanSelected.some((c) => c.toLowerCase() === city.toLowerCase());
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    if (!isSelected) handleSelectLocation(city);
                    else handleRemoveLocation(city);
                  }}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                    isSelected
                      ? "bg-[#E0564C] border-[#E0564C] text-white"
                      : "bg-[#F8FAFD] border-[#CBD5E1] text-[#475569] hover:bg-white hover:border-[#94A3B8]"
                  }`}
                >
                  {isSelected ? `✓ ${city}` : `+ ${city}`}
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};

