/**
 * /utils/styling.js
 * Human-crafted Editorial Clinical & Nutritional Design System for BloodBite:
 * 1. Light (Paper): Warm archival linen canvas (#FAF8F5), crisp paper surfaces (#FFFFFF),
 *    1px stone hairlines, and deep botanical forest ink (#1B4D3E). (Unchanged)
 * 2. Dark (Evening): Deep Ocean Petrol (#0B161C) & Clinical Teal surfaces (#102029)
 *    paired with Luminous Medical Cyan (#17C2DB / #22D3EE) matched to the BloodBite logo.
 * 3. High-Contrast (Contrast): Deep Abyssal Teal-Black (#040B0E) with crisp Electric
 *    Cyan (#22D3EE) and high-luminance borders matched to the BloodBite logo.
 */

export const THEME_MODES = {
  light: {
    id: 'light',
    labelEn: 'Paper',
    labelTe: 'పేపర్',
    pageBg:
      'min-h-screen bg-[#FAF8F5] text-[#1C2421] selection:bg-[#1B4D3E] selection:text-white transition-colors duration-200',
    headerBar:
      'bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E5DFD3]',
    glassCard:
      'bg-white border border-[#E5DFD3] shadow-[0_1px_3px_rgba(28,36,33,0.04)] text-[#1C2421]',
    elevatedCard:
      'bg-white border border-[#DCD4C6] shadow-[0_2px_8px_rgba(28,36,33,0.05)] text-[#1C2421]',
    insetBox: 'bg-[#F4F1EA] border border-[#E5DFD3] text-[#1C2421]',
    selectedCard: 'bg-[#E9F2EE] border-[#1B4D3E] text-[#1C2421]',
    textPrimary: 'text-[#1C2421]',
    textSecondary: 'text-[#4A5550]',
    textMuted: 'text-[#6E7A74]',
    brandAccentText: 'text-[#1B4D3E]',
    divider: 'border-[#E5DFD3]',
    switcherTrack: 'bg-[#EFECE4] border border-[#DFD8CA]',
    switcherActive: 'bg-white text-[#1C2421] shadow-xs border border-[#D5CEBF]',
    switcherInactive: 'text-[#5A6660] hover:text-[#1C2421]',
    massivePrimaryBtn:
      'bg-[#1B4D3E] hover:bg-[#153D31] text-white border border-[#143A2E] shadow-xs focus-visible:ring-[#1B4D3E]',
    massiveSubtleBtn:
      'bg-white hover:bg-[#F4F1EA] text-[#1C2421] border border-[#D5CEBF] hover:border-[#1B4D3E] focus-visible:ring-[#1B4D3E]',
    secondaryPillBtn:
      'bg-white hover:bg-[#F4F1EA] text-[#1C2421] border border-[#D5CEBF] focus-visible:ring-[#1B4D3E]',
    voiceBtn:
      'bg-[#1C2421] hover:bg-[#2C3733] text-white border border-[#1C2421] focus-visible:ring-[#1B4D3E]',
    modalSurface: 'bg-[#FAF8F5] border border-[#D5CEBF] text-[#1C2421] shadow-xl',
    stepBadge: 'bg-[#E9F2EE] text-[#1B4D3E] border border-[#C6DDD3]',
    SafeBanner: 'bg-[#F4F9F6] border border-[#C6DDD3] text-[#142921]',
    warningBanner: 'bg-[#FDF8EE] border border-[#E6CBA8] text-[#3B2A14]',
    dangerBanner: 'bg-[#FDF6F4] border border-[#E8C5B8] text-[#2B1814]',
    attentionSectionBg: 'bg-[#FDF6F4] border border-[#E8C5B8] text-[#2B1814]',
    attentionCardHigh: 'bg-white border border-[#DFB2A3]',
    attentionCardLow: 'bg-white border border-[#E6CBA8]',
    allGoodSectionBg: 'bg-[#F4F9F6] border border-[#C6DDD3] text-[#142921]',
    allGoodRow: 'bg-white border border-[#DCEAE3] text-[#1C2421]',
  },
  dark: {
    id: 'dark',
    labelEn: 'Evening',
    labelTe: 'డార్క్',
    pageBg:
      'min-h-screen bg-[#0B161C] text-[#ECF6F9] selection:bg-[#17C2DB] selection:text-[#061014] transition-colors duration-200',
    headerBar:
      'bg-[#0B161C]/95 backdrop-blur-md border-b border-[#1C3542]',
    glassCard:
      'bg-[#102029] border border-[#1E3A47] shadow-[0_4px_20px_rgba(4,11,14,0.35)] text-[#ECF6F9]',
    elevatedCard:
      'bg-[#132631] border border-[#254859] shadow-lg shadow-black/40 text-[#ECF6F9]',
    insetBox: 'bg-[#0D1B22] border border-[#1C3542] text-[#D8ECF2]',
    selectedCard: 'bg-[#143340] border-[#22D3EE] text-[#ECF6F9]',
    textPrimary: 'text-[#ECF6F9]',
    textSecondary: 'text-[#9EC1CD]',
    textMuted: 'text-[#6D93A1]',
    brandAccentText: 'text-[#22D3EE]',
    divider: 'border-[#1E3A47]',
    switcherTrack: 'bg-[#0E1C24] border border-[#1E3A47]',
    switcherActive: 'bg-[#157A8C] text-white border border-[#22C1DC] shadow-xs',
    switcherInactive: 'text-[#8EB4C2] hover:text-[#ECF6F9]',
    massivePrimaryBtn:
      'bg-[#157A8C] hover:bg-[#198FA3] text-white border border-[#22C1DC] shadow-sm focus-visible:ring-[#22D3EE]',
    massiveSubtleBtn:
      'bg-[#102029] hover:bg-[#162C38] text-[#ECF6F9] border border-[#254859] hover:border-[#22D3EE] focus-visible:ring-[#22D3EE]',
    secondaryPillBtn:
      'bg-[#102029] hover:bg-[#162C38] text-[#ECF6F9] border border-[#254859] focus-visible:ring-[#22D3EE]',
    voiceBtn:
      'bg-[#17C2DB] hover:bg-[#22D3EE] text-[#061217] border border-[#67E8F9] focus-visible:ring-[#22D3EE]',
    modalSurface: 'bg-[#102029] border border-[#254859] text-[#ECF6F9] shadow-2xl',
    stepBadge: 'bg-[#132E3A] text-[#22D3EE] border border-[#1E4D60]',
    SafeBanner: 'bg-[#0E242E] border border-[#1E4E63] text-[#E0F7FA]',
    warningBanner: 'bg-[#211B12] border border-[#6B5324] text-[#FDE68A]',
    dangerBanner: 'bg-[#241416] border border-[#6E2D35] text-[#FECDD3]',
    attentionSectionBg: 'bg-[#211416] border border-[#59272D] text-[#FCE7E9]',
    attentionCardHigh: 'bg-[#1A1214] border border-[#6E2D35]',
    attentionCardLow: 'bg-[#1E1A12] border border-[#6B5324]',
    allGoodSectionBg: 'bg-[#0E222B] border border-[#1D495C] text-[#E4F5F8]',
    allGoodRow: 'bg-[#122934] border border-[#1F4556] text-[#ECF6F9]',
  },
  neon: {
    id: 'neon',
    labelEn: 'Contrast',
    labelTe: 'కాంట్రాస్ట్',
    pageBg:
      'min-h-screen bg-[#040B0E] text-white selection:bg-[#22D3EE] selection:text-black transition-colors duration-200',
    headerBar:
      'bg-[#040B0E] border-b border-[#17C2DB]/70',
    glassCard:
      'bg-[#071319] border border-[#17C2DB]/65 text-white',
    elevatedCard:
      'bg-[#091820] border-2 border-[#22D3EE] shadow-[0_0_24px_rgba(23,194,219,0.14)] text-white',
    insetBox:
      'bg-[#050F14] border border-[#157A8C] text-[#E0F7FA]',
    selectedCard: 'bg-[#0C2633] border-2 border-[#22D3EE] text-white',
    textPrimary: 'text-white',
    textSecondary: 'text-[#BAE6FD]',
    textMuted: 'text-[#7DD3FC]',
    brandAccentText: 'text-[#22D3EE]',
    divider: 'border-[#157A8C]',
    switcherTrack: 'bg-[#071319] border border-[#17C2DB]/75',
    switcherActive:
      'bg-[#22D3EE] text-[#040B0E] font-semibold border border-white',
    switcherInactive: 'text-[#7DD3FC] hover:text-white',
    massivePrimaryBtn:
      'bg-[#17C2DB] hover:bg-[#22D3EE] text-[#040B0E] font-bold border-2 border-[#A5F3FC] focus-visible:ring-[#22D3EE]',
    massiveSubtleBtn:
      'bg-[#071319] hover:bg-[#0D222C] text-white border-2 border-[#17C2DB] focus-visible:ring-[#22D3EE]',
    secondaryPillBtn:
      'bg-[#071319] hover:bg-[#0D222C] text-[#E0F7FA] border border-[#17C2DB] focus-visible:ring-[#22D3EE]',
    voiceBtn:
      'bg-[#FACC15] hover:bg-[#FDE047] text-[#040B0E] font-bold border-2 border-white focus-visible:ring-[#FACC15]',
    modalSurface:
      'bg-[#071319] border-2 border-[#22D3EE] text-white shadow-2xl',
    stepBadge:
      'bg-[#0B222C] text-[#22D3EE] border border-[#22D3EE]/70',
    SafeBanner: 'bg-[#081E26] border-2 border-[#22D3EE] text-white',
    warningBanner: 'bg-[#1C1608] border-2 border-[#FACC15] text-white',
    dangerBanner: 'bg-[#1F0D10] border-2 border-[#FB7185] text-white',
    attentionSectionBg:
      'bg-[#1C0C0E] border-2 border-[#FB7185] text-white',
    attentionCardHigh:
      'bg-[#14090B] border-2 border-[#FB7185]',
    attentionCardLow:
      'bg-[#171208] border-2 border-[#FACC15]',
    allGoodSectionBg:
      'bg-[#071B22] border-2 border-[#22D3EE] text-white',
    allGoodRow:
      'bg-[#0A222B] border border-[#17C2DB] text-white',
  },
};

export const THEME = {
  canvas: {
    page: THEME_MODES.light.pageBg,
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6',
    glassSurface: 'rounded-2xl',
    elevatedSurface: 'rounded-2xl',
  },
  typography: {
    heroTitle:
      'font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold tracking-tight leading-[1.15]',
    sectionTitle:
      'font-display text-xl sm:text-2xl font-semibold tracking-tight leading-snug',
    cardTitle: 'font-display text-lg sm:text-xl font-semibold leading-snug',
    bodyLarge: 'text-base sm:text-lg font-normal leading-relaxed',
    bodyBase: 'text-sm sm:text-base font-normal leading-relaxed',
    metricHuge: 'tabular-nums text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight',
    labelQuiet: 'text-xs sm:text-sm font-medium',
  },
  buttons: {
    base: 'relative inline-flex items-center justify-center gap-2.5 font-sans font-semibold rounded-xl transition-colors duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-55 disabled:pointer-events-none cursor-pointer select-none',
    massivePrimary: 'w-full min-h-[60px] sm:min-h-[68px] px-5 py-3.5 text-base sm:text-lg',
    massiveSubtle: 'w-full min-h-[56px] sm:min-h-[64px] px-5 py-3 text-base sm:text-lg',
    actionVoice: 'min-h-[46px] px-4 py-2.5 text-sm sm:text-base whitespace-nowrap shrink-0',
    actionVoiceActive:
      'min-h-[46px] px-4 py-2.5 text-sm sm:text-base bg-[#D97706] hover:bg-[#B45309] text-white border border-[#B45309] whitespace-nowrap shrink-0',
    actionWhatsApp:
      'w-full sm:w-auto min-h-[52px] px-6 py-3 text-base sm:text-lg bg-[#157A8C] hover:bg-[#116373] text-white border border-[#1E9BB0] whitespace-nowrap shrink-0',
    secondaryPill: 'min-h-[42px] px-4 py-2 text-sm sm:text-base whitespace-nowrap shrink-0',
  },
};

export function getThemeTokens(mode = 'light') {
  return THEME_MODES[mode] || THEME_MODES.light;
}
