import { SwiperSlide } from 'swiper/react';

import TrackerCard from '@/components/TrackerCard';
import SwiperContainer from '@/components/sliders/SliderContainer';

type Tracker = {
    id: number;
    trackerStats: string;
    trackerName: string;
};

interface TrackerSliderProps {
    trackers: Tracker[];
}

const TrackerSlider = ({ trackers }: TrackerSliderProps) => {
    return (
        <SwiperContainer
            swiperOptions={{
                slidesPerView: 'auto',
                spaceBetween: 16,
                className: 'mt-2',
            }}
        >
            {trackers.map((item) => (
                <SwiperSlide key={item.id} className="!w-auto">
                    <TrackerCard
                        trackerStats={item.trackerStats}
                        trackerName={item.trackerName}
                    />
                </SwiperSlide>
            ))}
        </SwiperContainer>
    );
};

export default TrackerSlider;
