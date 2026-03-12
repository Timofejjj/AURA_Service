'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { addDays, differenceInDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Swiper as SwiperCore } from 'swiper';
import { Virtual } from 'swiper/modules';
import { SwiperSlide } from 'swiper/react';

import SwiperContainer from '@/components/sliders/SliderContainer';

import WeekContent from './components/WeekContent';
import { START_DATE, TOTAL_WEEKS } from './constants/datePicker.constants';
import './styles/swiper-fix.css';

interface DatePickerProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export default function DatePickerSlider({
    selectedDate,
    onSelectDate,
}: DatePickerProps) {
    const swiperRef = useRef<SwiperCore | null>(null);
    const [displayDate, setDisplayDate] = useState(selectedDate);

    const initialWeekIndex = useMemo(() => {
        const diff = differenceInDays(selectedDate, START_DATE);
        return Math.floor(diff / 7);
    }, [selectedDate]);

    const weeks = useMemo(
        () => Array.from({ length: TOTAL_WEEKS }, (_, i) => i),
        []
    );

    useEffect(() => {
        setDisplayDate(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (!swiperRef.current) return;
        const targetWeekIndex = Math.floor(
            differenceInDays(selectedDate, START_DATE) / 7
        );
        if (swiperRef.current.activeIndex !== targetWeekIndex) {
            swiperRef.current.slideTo(targetWeekIndex, 0);
        }
    }, [selectedDate]);

    const handleSlideChangeEnd = useCallback((swiper: SwiperCore) => {
        const middleOfWeek = addDays(START_DATE, swiper.activeIndex * 7 + 3);
        setDisplayDate(middleOfWeek);
    }, []);

    const swiperOptions = useMemo(
        () => ({
            modules: [Virtual],
            virtual: true,
            slidesPerView: 1,
            spaceBetween: 0,
            initialSlide: initialWeekIndex,
            className: 'w-full',
            onSwiper: (swiper: SwiperCore) => {
                swiperRef.current = swiper;
            },
            onSlideChangeTransitionEnd: handleSlideChangeEnd,
        }),
        [initialWeekIndex, handleSlideChangeEnd]
    );

    const formattedMonthYear = useMemo(() => {
        const monthYear = format(displayDate, 'LLLL yyyy', { locale: ru });
        return monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    }, [displayDate]);

    const memoizedOnSelectDate = useCallback(
        (date: Date) => {
            onSelectDate(date);
        },
        [onSelectDate]
    );

    return (
        <div>
            <div className="mb-2 text-center">
                <h2 className="text-lg font-semibold">{formattedMonthYear}</h2>
            </div>
            <div style={{ cursor: 'grab' }}>
                <SwiperContainer swiperOptions={swiperOptions}>
                    {weeks.map((weekIndex) => (
                        <SwiperSlide key={weekIndex} virtualIndex={weekIndex}>
                            <div className="flex h-[100px] w-screen items-center justify-center">
                                <WeekContent
                                    weekIndex={weekIndex}
                                    selectedDate={selectedDate}
                                    onSelectDate={memoizedOnSelectDate}
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </SwiperContainer>
            </div>
        </div>
    );
}
