import { SwiperSlide } from 'swiper/react';

import RecordCard from '@/components/RecordCard';
import SwiperContainer from '@/components/sliders/SliderContainer';

type Record = {
    id: number;
    title: string;
    count: number;
};

interface RecordSliderProps {
    records: Record[];
}

const RecordSlider = ({ records }: RecordSliderProps) => {
    return (
        <SwiperContainer
            swiperOptions={{
                slidesPerView: 'auto',
                spaceBetween: 16,
                className: ' mt-2',
            }}
        >
            {records.map((item) => (
                <SwiperSlide key={item.id} className="!w-auto">
                    <RecordCard title={item.title} count={item.count} />
                </SwiperSlide>
            ))}
        </SwiperContainer>
    );
};

export default RecordSlider;
