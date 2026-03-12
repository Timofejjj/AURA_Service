'use client';

import { ReactNode } from 'react';

import 'swiper/css';
import { Swiper } from 'swiper/react';
import { SwiperOptions } from 'swiper/types';

interface SwiperContainerProps {
    children: ReactNode;
    title?: string;
    swiperOptions: SwiperOptions & { className?: string };
}

const SwiperContainer = ({
    children,
    title,
    swiperOptions,
}: SwiperContainerProps) => {
    return (
        <section className="mb-8 w-full">
            {title && <h2 className="mb-4 px-4 text-2xl font-bold">{title}</h2>}
            <Swiper {...swiperOptions}>{children}</Swiper>
        </section>
    );
};

export default SwiperContainer;
