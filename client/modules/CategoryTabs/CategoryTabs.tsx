'use client';

import React, { useEffect, useRef } from 'react';

import type { Swiper as SwiperCore } from 'swiper';
import 'swiper/css';
import { Swiper, SwiperSlide } from 'swiper/react';

interface Category {
    id: string;
    title: string;
}

interface CategoryTabsProps {
    categories: Category[];
    activeCategory: string;
    onSelectCategory: (categoryId: string) => void;
}

export default function CategoryTabs({
    categories,
    activeCategory,
    onSelectCategory,
}: CategoryTabsProps) {
    const swiperRef = useRef<SwiperCore | null>(null);

    useEffect(() => {
        if (swiperRef.current) {
            const targetIndex = categories.findIndex(
                (c) => c.id === activeCategory
            );
            if (
                targetIndex !== -1 &&
                swiperRef.current.activeIndex !== targetIndex
            ) {
                swiperRef.current.slideTo(targetIndex, 300);
            }
        }
    }, [activeCategory, categories]);

    const handleSlideChange = (swiper: SwiperCore) => {
        const newCategory = categories[swiper.activeIndex];
        if (newCategory && newCategory.id !== activeCategory) {
            onSelectCategory(newCategory.id);
        }
    };

    return (
        <div className="w-full overflow-hidden">
            <Swiper
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                onSlideChangeTransitionEnd={handleSlideChange}
                slidesPerView={1.2}
                spaceBetween={0}
                slidesOffsetBefore={20}
                slidesOffsetAfter={20}
            >
                {categories.map((category) => (
                    <SwiperSlide key={category.id} style={{ width: '240px' }}>
                        <button
                            onClick={() => onSelectCategory(category.id)}
                            className={`py-2 text-3xl font-bold whitespace-nowrap transition-colors duration-300 ${
                                activeCategory === category.id
                                    ? 'text-black'
                                    : 'text-gray-400'
                            }`}
                        >
                            {category.title}
                        </button>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
