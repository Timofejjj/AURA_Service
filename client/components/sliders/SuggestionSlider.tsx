import { SwiperSlide } from 'swiper/react';

import SuggestionCard from '@/components/SuggestionCard';
import SwiperContainer from '@/components/sliders/SliderContainer';

type Suggestion = {
    id: number;
    text: string;
};

interface SuggestionSliderProps {
    suggestions: Suggestion[];
}

const SuggestionSlider = ({ suggestions }: SuggestionSliderProps) => {
    return (
        <SwiperContainer
            swiperOptions={{
                slidesPerView: 'auto',
                spaceBetween: 16,
                className: ' mt-2',
            }}
        >
            {suggestions.map((item) => (
                <SwiperSlide key={item.id} className="!w-auto">
                    <SuggestionCard text={item.text} />
                </SwiperSlide>
            ))}
        </SwiperContainer>
    );
};

export default SuggestionSlider;
