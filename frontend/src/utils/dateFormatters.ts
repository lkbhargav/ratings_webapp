/**
 * Date formatting utilities for consistent local time display
 * All dates from the backend are in UTC (ISO 8601 format)
 * These formatters convert to the user's local time
 */

/**
 * Format date only (no time)
 * @param dateString - ISO 8601 date string from backend
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

/**
 * Format date and time
 * @param dateString - ISO 8601 date string from backend
 * @returns Formatted date and time string (e.g., "Jan 15, 2025, 3:30 PM")
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

/**
 * Format date and time with timezone
 * Useful for activity logs and audit trails
 * @param dateString - ISO 8601 date string from backend
 * @returns Formatted date, time, and timezone string (e.g., "Jan 15, 2025, 3:30 PM PST")
 */
export const formatDateTimeWithTimezone = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);
};
