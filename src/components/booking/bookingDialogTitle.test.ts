import { describe, expect, it } from 'vitest';
import { bookingDialogTitle } from './JobEquipmentBookingDialog';

describe('booking dialog title', () => {
  it('names the action, never the equipment (it is listed in the dialog)', () => {
    expect(bookingDialogTitle({})).toBe('Book Equipment');
    expect(bookingDialogTitle({ editing: true })).toBe('Change Booking');
  });

  it('makes a client’s booking a request, since the lab must approve it', () => {
    expect(bookingDialogTitle({ requiresApproval: true })).toBe('Request to Book Equipment');
    expect(bookingDialogTitle({ requiresApproval: true, editing: true })).toBe('Request to Change Booking');
  });
});
