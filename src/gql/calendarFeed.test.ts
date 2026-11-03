import { print } from 'graphql';
import { describe, expect, it } from 'vitest';
import { GET_CALENDAR_FEED } from './queries';
import { RESET_CALENDAR_FEED } from './mutations';

const compact = (document: Parameters<typeof print>[0]): string => print(document).replace(/\s+/g, ' ').trim();

/** Names are the backend's: src/calendar-feed/calendar-feed.resolver.ts and calendar-feed.types.ts. */
describe('calendar feed GraphQL contracts', () => {
  it('reads and resets the caller’s own link with no arguments', () => {
    expect(compact(GET_CALENDAR_FEED)).toBe('query CalendarFeed { calendarFeed { url createdAt } }');
    expect(compact(RESET_CALENDAR_FEED)).toBe('mutation ResetCalendarFeed { resetCalendarFeed { url createdAt } }');
  });
});
