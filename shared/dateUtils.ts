import { addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";

export function calculateNextPaymentDate(
  frequency: string,
  lastPaymentDate?: Date | string | null
): Date {
  const baseDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date();
  
  switch (frequency) {
    case "weekly":
      return addWeeks(baseDate, 1);
    case "fortnightly":
      return addWeeks(baseDate, 2);
    case "monthly":
      return addMonths(baseDate, 1);
    case "quarterly":
      return addQuarters(baseDate, 1);
    case "annual":
      return addYears(baseDate, 1);
    default:
      return addMonths(baseDate, 1); // Default to monthly
  }
}

export function getNextDueDate(frequency: string, currentDueDate?: Date | string | null): Date {
  if (currentDueDate) {
    const current = new Date(currentDueDate);
    // If the current due date is in the future, return it
    if (current > new Date()) {
      return current;
    }
    // If it's in the past, calculate the next occurrence
    return calculateNextPaymentDate(frequency, current);
  }
  
  // No current due date, calculate from today
  return calculateNextPaymentDate(frequency);
}

export function formatFrequency(frequency: string): string {
  switch (frequency) {
    case "weekly":
      return "Weekly";
    case "fortnightly":
      return "Fortnightly";
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annual";
    default:
      return "Monthly";
  }
}