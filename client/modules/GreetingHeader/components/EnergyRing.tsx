    import GradientEnergyRing from '@/ui/GradientEnergyRing';

    interface EnergyRingProps {
        progressValue: number;
    }

    const EnergyRing = ({ progressValue }: EnergyRingProps) => {
        return (
            <GradientEnergyRing>
                <p className="sans max-w-[215px] text-base text-gray-500">
                    Уровень вашей энергии сегодня:
                </p>
                {/*<div className="sans absolute right-0 mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-black p-0.5 text-center align-top text-white">*/}
                {/*    ?*/}
                {/*</div>*/}
                <div className="mt-4 flex items-center justify-center text-5xl font-black">
                    <span className="leading-none">{progressValue}%</span>
                </div>
            </GradientEnergyRing>
        );
    };

    export default EnergyRing;
