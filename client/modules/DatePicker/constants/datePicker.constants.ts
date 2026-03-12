import { startOfToday, startOfWeek, subYears } from 'date-fns';

export const YEARS_RANGE = 15;

export const TODAY = startOfToday();

export const START_DATE = startOfWeek(subYears(TODAY, YEARS_RANGE), {
    weekStartsOn: 1,
});

export const TOTAL_DAYS = Math.ceil(YEARS_RANGE * 2 * 365.25);
export const TOTAL_WEEKS = Math.ceil(TOTAL_DAYS / 7);
