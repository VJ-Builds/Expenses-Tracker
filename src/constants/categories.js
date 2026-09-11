// Pre-seeded expense categories
export const CATEGORIES = [
  { id: 1, name: 'Food & Dining',   icon: '🍽️', color: '#FF6B6B' },
  { id: 2, name: 'Transport',       icon: '🚗', color: '#4ECDC4' },
  { id: 3, name: 'Shopping',        icon: '🛍️', color: '#A78BFA' },
  { id: 4, name: 'Health',          icon: '💊', color: '#F97316' },
  { id: 5, name: 'Utilities',       icon: '💡', color: '#FBBF24' },
  { id: 6, name: 'Entertainment',   icon: '🎬', color: '#EC4899' },
  { id: 7, name: 'Education',       icon: '📚', color: '#3B82F6' },
  { id: 8, name: 'Rent',            icon: '🏠', color: '#10B981' },
  { id: 9, name: 'Groceries',       icon: '🛒', color: '#84CC16' },
  { id: 10, name: 'Other',          icon: '📦', color: '#6B7280' },
];

export const getCategoryById = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[9];

export const getCategoryByName = (name) =>
  CATEGORIES.find((c) => c.name === name) || CATEGORIES[9];

export const CATEGORY_DROPDOWN_ITEMS = CATEGORIES.map((c) => ({
  label: `${c.icon}  ${c.name}`,
  value: c.id,
}));
