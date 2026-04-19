import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatToIST(dateInput: string | number | Date, options: Intl.DateTimeFormatOptions = {}) {
  if (!dateInput) return '';
  let date: Date;
  if (typeof dateInput === 'string' && !dateInput.endsWith('Z') && !dateInput.includes('+')) {
    // SQLite DATETIME strings (YYYY-MM-DD HH:MM:SS) need T and Z for UTC
    date = new Date(dateInput.replace(' ', 'T') + 'Z');
  } else {
    date = new Date(dateInput);
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }).format(date);
}

export function formatDateTimeToIST(dateInput: string | number | Date) {
  if (!dateInput) return '';
  let date: Date;
  if (typeof dateInput === 'string' && !dateInput.endsWith('Z') && !dateInput.includes('+')) {
    date = new Date(dateInput.replace(' ', 'T') + 'Z');
  } else {
    date = new Date(dateInput);
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

export function getISTDateForInput(dateInput: string | number | Date = new Date()) {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns a string formatted for <input type="datetime-local"> representing current IST time
 */
export function getISTNowForInput() {
  const now = new Date();
  // We want YYYY-MM-DDTHH:mm in IST
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

/**
 * Converts a local datetime-local value (assumed to be IST) to a UTC ISO string for storage
 */
export function istToUTC(istString: string) {
  // istString is "YYYY-MM-DDTHH:mm"
  // We add the offset or use a trick with Intl
  // Simplest is to append the offset but +5:30
  return new Date(istString + '+05:30').toISOString();
}
