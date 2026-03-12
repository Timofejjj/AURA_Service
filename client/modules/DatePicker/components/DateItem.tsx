'use client';

import { memo, useCallback } from 'react';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DateItemProps {
    date: Date;
    isActive: boolean;
    onSelectDate: (date: Date) => void;
}

const DateItem = memo(({ date, isActive, onSelectDate }: DateItemProps) => {
    const activeStyles = {
        background: 'linear-gradient(180deg, #3e01db 0%, #892ccf 100%)',
    };

    const handleClick = useCallback(() => {
        onSelectDate(date);
    }, [onSelectDate, date]);

    return (
        <div className="w-[55px] shrink-0 p-[5px]">
            <button
                onClick={handleClick}
                className={`sans flex h-[72px] w-[45px] flex-col items-center justify-center rounded-[24px] text-base transition-colors duration-200 ${
                    isActive
                        ? 'text-white'
                        : 'border border-[rgba(0,0,0,0.3)] bg-white text-black'
                }`}
                style={isActive ? activeStyles : {}}
            >
                <span>{format(date, 'd')}</span>
                <span>{format(date, 'EEEEEE', { locale: ru })}</span>
            </button>
        </div>
    );
});

DateItem.displayName = 'DateItem';
export default DateItem;
