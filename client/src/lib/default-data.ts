// lib/default-data.ts

export const defaultEnvelopeCategories = [
  { name: "Living", sort_order: 1 },
  { name: "Savings", sort_order: 2 },
  { name: "Fun", sort_order: 3 },
];

export const defaultEnvelopes = [
  {
    name: "Groceries",
    category: "Living",
    budget_amount: 500,
    current_balance: 500,
    icon: "🛒",
    frequency: "monthly",
  },
  {
    name: "Rent",
    category: "Living",
    budget_amount: 1500,
    current_balance: 1500,
    icon: "🏠",
    frequency: "monthly",
  },
  {
    name: "Emergency Fund",
    category: "Savings",
    budget_amount: 200,
    current_balance: 200,
    icon: "💰",
    frequency: "monthly",
  },
  {
    name: "Dining Out",
    category: "Fun",
    budget_amount: 150,
    current_balance: 150,
    icon: "🍽️",
    frequency: "monthly",
  },
];
