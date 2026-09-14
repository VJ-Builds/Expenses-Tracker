/**
 * Typography Constants & System for Notes Suite
 * Curated selection of 7 premium, 100% free open-source fonts + numeric font size scale.
 */

export const FONT_OPTIONS = [
  {
    id: 'Poppins',
    label: 'Poppins',
    category: 'Geometric Sans',
    regularFont: 'Poppins_500Medium',
    boldFont: 'Poppins_700Bold',
    previewText: 'Clean & modern geometric typeface',
  },
  {
    id: 'Inter',
    label: 'Inter',
    category: 'Swiss Clean Sans',
    regularFont: 'Inter_400Regular',
    boldFont: 'Inter_600SemiBold',
    previewText: 'Crisp, highly legible digital reading',
  },
  {
    id: 'Outfit',
    label: 'Outfit',
    category: 'Tech Sans',
    regularFont: 'Outfit_400Regular',
    boldFont: 'Outfit_600SemiBold',
    previewText: 'Aesthetic, friendly, modern Apple/Google style',
  },
  {
    id: 'Lora',
    label: 'Lora',
    category: 'Editorial Serif',
    regularFont: 'Lora_400Regular',
    boldFont: 'Lora_600SemiBold',
    previewText: 'Contemporary book & reflective journaling serif',
  },
  {
    id: 'Playfair',
    label: 'Playfair',
    category: 'Luxury Serif',
    regularFont: 'PlayfairDisplay_400Regular',
    boldFont: 'PlayfairDisplay_600SemiBold',
    previewText: 'High-contrast, elegant editorial look',
  },
  {
    id: 'JetBrainsMono',
    label: 'JetBrains Mono',
    category: 'Technical Code',
    regularFont: 'JetBrainsMono_400Regular',
    boldFont: 'JetBrainsMono_600SemiBold',
    previewText: 'Developer monospace, structured notes & logs',
  },
  {
    id: 'Caveat',
    label: 'Caveat',
    category: 'Handwriting',
    regularFont: 'Caveat_400Regular',
    boldFont: 'Caveat_700Bold',
    previewText: 'Organic ink handwriting for personal diaries',
  },
];

export const NUMERIC_FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 36;
export const DEFAULT_FONT_FAMILY = 'Poppins';
export const DEFAULT_FONT_SIZE = 16;

/**
 * Returns the loaded font-family name for a given font ID and weight
 */
export const getNoteFontFamily = (fontId = DEFAULT_FONT_FAMILY, isBold = false) => {
  const match = FONT_OPTIONS.find((f) => f.id === fontId);
  if (!match) {
    return isBold ? 'Poppins_700Bold' : 'Poppins_500Medium';
  }
  return isBold ? match.boldFont : match.regularFont;
};

/**
 * Get scaled title font size based on selected body font size
 */
export const getTitleFontSize = (bodyFontSize = DEFAULT_FONT_SIZE) => {
  const size = Number(bodyFontSize) || DEFAULT_FONT_SIZE;
  return Math.min(Math.round(size * 1.4), 42);
};
