import type { Segment } from "../services/segments";

/**
 * Microsoft Teams Shifts theme options.
 * These match the exact format used in Teams Shifts Excel exports.
 * Order matches the Teams app dropdown: White, Blue, Green, Purple, Pink, Yellow, Gray, Dark blue, Dark green, Dark purple, Dark pink, Dark yellow
 */
export const SHIFTS_THEMES = [
  { value: "1. White", label: "White", color: "#f5f5f5" },
  { value: "2. Blue", label: "Blue", color: "#91caff" },
  { value: "3. Green", label: "Green", color: "#bbf7d0" },
  { value: "4. Purple", label: "Purple", color: "#e9d5ff" },
  { value: "5. Pink", label: "Pink", color: "#fbcfe8" },
  { value: "6. Yellow", label: "Yellow", color: "#fef08a" },
  { value: "7. Gray", label: "Gray", color: "#d4d4d4" },
  { value: "8. DarkBlue", label: "Dark Blue", color: "#3b82f6" },
  { value: "9. DarkGreen", label: "Dark Green", color: "#22c55e" },
  { value: "10. DarkPurple", label: "Dark Purple", color: "#a855f7" },
  { value: "11. DarkPink", label: "Dark Pink", color: "#ec4899" },
  { value: "12. DarkYellow", label: "Dark Yellow", color: "#eab308" },
] as const;

export type ShiftsThemeValue = typeof SHIFTS_THEMES[number]["value"];

/**
 * Calculate relative luminance of a hex color using WCAG formula.
 * Returns a value between 0 (black) and 1 (white).
 */
function getLuminance(hex: string): number {
  const rgb = hex.replace(/^#/, "");
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Get the appropriate text color (black or white) for a given background hex color.
 * Uses WCAG luminance calculation to determine contrast.
 */
export function getContrastColor(hexBg: string): string {
  const luminance = getLuminance(hexBg);
  // Use white text on dark backgrounds (luminance < 0.5)
  return luminance < 0.5 ? "#ffffff" : "#000000";
}

/**
 * Find a theme by its value string.
 * Supports both exact match and legacy formats.
 */
export function findThemeByValue(value: string | null | undefined): typeof SHIFTS_THEMES[number] | undefined {
  if (!value) return undefined;
  return SHIFTS_THEMES.find(t => t.value === value);
}

export const GROUPS: Record<string, { theme: string; color: string }> = {
  "Bakery": { theme: "4. Purple", color: "#e9d5ff" },
  "Lunch": { theme: "11. DarkPink", color: "#f9a8d4" },
  "Dining Room": { theme: "12. DarkYellow", color: "#fde68a" },
  "Veggie Room": { theme: "3. Green", color: "#bbf7d0" },
  "Machine Room": { theme: "10. DarkPurple", color: "#c4b5fd" },
  "Main Course": { theme: "5. Pink", color: "#fbcfe8" },
  "Prepack": { theme: "9. DarkGreen", color: "#a7f3d0" },
  "Office": { theme: "12. DarkYellow", color: "#fde68a" },
  "Receiving": { theme: "8. DarkBlue", color: "#bfdbfe" },
  "Weekend Duty": { theme: "5. Pink", color: "#fbcfe8" },
};

export const ROLE_SEED: Array<{ code: string; name: string; group: keyof typeof GROUPS; segments: Segment[] }> = [
  { code: "DR", name: "Dining Room", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Dining Room Training", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Dining Room Supervisor", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Dining Room Assistant", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Pattern", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Pattern Training", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Pattern Supervisor", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Pattern Assistant", group: "Dining Room", segments: ["AM", "PM"] },
  { code: "DR", name: "Breakfast", group: "Dining Room", segments: ["Early"] },

  { code: "MR", name: "MRC", group: "Machine Room", segments: ["AM", "PM"] },
  { code: "MR", name: "Feeder", group: "Machine Room", segments: ["AM", "PM"] },
  { code: "MR", name: "Silverware", group: "Machine Room", segments: ["AM", "PM"] },
  { code: "MR", name: "Cold End", group: "Machine Room", segments: ["AM", "PM"] },
  { code: "MR", name: "Hot End 1", group: "Machine Room", segments: ["AM", "PM"] },
  { code: "MR", name: "Hot End 2", group: "Machine Room", segments: ["AM", "PM"] },
  { code: "MR", name: "MR Assist", group: "Machine Room", segments: ["AM", "PM"] },

  { code: "MC", name: "Main Course", group: "Main Course", segments: ["AM", "PM"] },
  { code: "MC", name: "Main Course Coordinator", group: "Main Course", segments: ["AM", "PM"] },
  { code: "MC", name: "Main Course Assistant", group: "Main Course", segments: ["AM", "PM"] },

  { code: "VEG", name: "Veggie Room", group: "Veggie Room", segments: ["AM", "PM"] },
  { code: "VEG", name: "Veggie Room Coordinator", group: "Veggie Room", segments: ["AM", "PM"] },
  { code: "VEG", name: "Veggie Room Assistant", group: "Veggie Room", segments: ["AM", "PM"] },

  { code: "BKRY", name: "Bakery", group: "Bakery", segments: ["AM", "PM"] },
  { code: "BKRY", name: "Bakery Coordinator", group: "Bakery", segments: ["AM", "PM"] },
  { code: "BKRY", name: "Bakery Assistant", group: "Bakery", segments: ["AM", "PM"] },

  { code: "RCVG", name: "Receiving", group: "Receiving", segments: ["AM", "PM"] },

  { code: "PP", name: "Prepack", group: "Prepack", segments: ["AM", "PM"] },
  { code: "PP", name: "Prepack Coordinator", group: "Prepack", segments: ["AM", "PM"] },
  { code: "PP", name: "Prepack Backup", group: "Prepack", segments: ["AM", "PM"] },

  { code: "OFF", name: "Office", group: "Office", segments: ["AM", "PM"] },

  { code: "L SUP", name: "Lunch Supervisor", group: "Lunch", segments: ["Lunch"] },
  { code: "DR SUP", name: "Dining Room Supervisor", group: "Lunch", segments: ["Lunch"] },
  { code: "ATT SUP", name: "Attendant Supervisor", group: "Lunch", segments: ["Lunch"] },
  { code: "R SUP", name: "Guest Supervisor", group: "Lunch", segments: ["Lunch"] },
  { code: "CK-IN", name: "Guest Check-In", group: "Lunch", segments: ["Lunch"] },
  { code: "ATT", name: "Attendant", group: "Lunch", segments: ["Lunch"] },
  { code: "WAITER", name: "Waiter", group: "Lunch", segments: ["Lunch"] },
  { code: "LN ATT", name: "Line Attendant", group: "Lunch", segments: ["Lunch"] },
  { code: "TL", name: "Tray Line", group: "Lunch", segments: ["Lunch"] },
  { code: "ATR", name: "ATR", group: "Lunch", segments: ["Lunch"] },
  { code: "TKO", name: "Take-Out Line", group: "Lunch", segments: ["Lunch"] },
  { code: "ATKO", name: "Assist Take-Out Line", group: "Lunch", segments: ["Lunch"] },

  // Lunch duties in other groups still count as Lunch segment
  { code: "MC", name: "Consolidation Table", group: "Main Course", segments: ["Lunch"] },
  { code: "VEG", name: "Consolidation Table", group: "Veggie Room", segments: ["Lunch"] },
];
