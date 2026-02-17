import { AppError } from './AppError';

// "19:00" → { hours: 19, minutes: 0 }
function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(':');
  if (parts.length !== 2) throw new AppError(400, `Invalid time format: ${time}`);
  const hours = parseInt(parts[0]!, 10);
  const minutes = parseInt(parts[1]!, 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new AppError(400, `Invalid time value: ${time}`);
  }
  return { hours, minutes };
}

// "19:00" → 1140 (total minutes from midnight)
function toMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

// 1140 → "19:00"
function fromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Add exactly 2 hours to a time string — "19:00" → "21:00"
export function addTwoHours(startTime: string): string {
  const totalMinutes = toMinutes(startTime) + 120;
  if (totalMinutes > 24 * 60) {
    throw new AppError(400, 'Reservation end time cannot exceed midnight');
  }
  return fromMinutes(totalMinutes);
}

// Check if two time windows overlap
// Overlap condition: existingStart < newEnd AND existingEnd > newStart
// Boundary touches (A ends exactly when B starts) are NOT overlaps
export function timesOverlap(
  existingStart: string,
  existingEnd: string,
  newStart: string,
  newEnd: string
): boolean {
  const es = toMinutes(existingStart);
  const ee = toMinutes(existingEnd);
  const ns = toMinutes(newStart);
  const ne = toMinutes(newEnd);
  return es < ne && ee > ns;
}

// Validate a time string is in HH:MM format and within operating hours
// Restaurants accept bookings from 09:00 to 22:00 (last slot 22:00 ends at 00:00 — blocked above)
export function validateBookingTime(time: string): void {
  const { hours, minutes } = parseTime(time);
  const totalMinutes = hours * 60 + minutes;

  if (totalMinutes < 9 * 60) {
    throw new AppError(400, 'Bookings start from 09:00');
  }
  if (totalMinutes > 22 * 60) {
    throw new AppError(400, 'Last booking slot is 22:00 (ends at 00:00)');
  }
  if (minutes !== 0 && minutes !== 30) {
    throw new AppError(400, 'Booking time must be on the hour or half-hour (e.g. 19:00 or 19:30)');
  }
}

// Validate booking date: must be today or up to 30 days ahead
export function validateBookingDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(400, 'Invalid date format. Use YYYY-MM-DD');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date < today) {
    throw new AppError(400, 'Reservation date cannot be in the past');
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  if (date > maxDate) {
    throw new AppError(400, 'Reservations can only be made up to 30 days in advance');
  }

  return date;
}
