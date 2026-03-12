'use client';

import React, { useMemo } from 'react';

import { addDays, isSameDay } from 'date-fns';

import { START_DATE } from '../constants/datePicker.constants';
import DateItem from './DateItem';

interface WeekContentProps {
    weekIndex: number;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

const WeekContent = React.memo(
    ({ weekIndex, selectedDate, onSelectDate }: WeekContentProps) => {
        const weekDays = useMemo(() => {
            const monday = addDays(START_DATE, weekIndex * 7);
            return Array.from({ length: 7 }).map((_, i) => addDays(monday, i));
        }, [weekIndex]);

        return (
            <div className="flex w-screen overflow-hidden">
                {weekDays.map((date) => (
                    <DateItem
                        key={date.toISOString()}
                        date={date}
                        isActive={isSameDay(date, selectedDate)}
                        onSelectDate={onSelectDate}
                    />
                ))}
            </div>
        );
    }
);

WeekContent.displayName = 'WeekContent';

export default WeekContent;
