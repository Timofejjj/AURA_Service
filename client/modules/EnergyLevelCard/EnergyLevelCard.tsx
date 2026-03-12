import sportBg from '@/public/sportEnergyBanner.jpg';
import studyBg from '@/public/studytEnergyBanner.jpg';
import workBg from '@/public/workEnergyBanner.jpg';

type ValidEnergyType = 'study' | 'work' | 'sport';

interface EnergyLevelCardProps {
    level: number;
    type: string;
}

const backgroundImages = {
    study: studyBg,
    sport: sportBg,
    work: workBg,
};

const validTypes: ValidEnergyType[] = ['study', 'work', 'sport'];

const EnergyLevelCard = ({ level, type }: EnergyLevelCardProps) => {
    if (!validTypes.includes(type as ValidEnergyType)) {
        return null;
    }

    return (
        <div
            className="relative flex h-[160px] w-[361px] flex-col justify-between overflow-hidden rounded-2xl p-6 text-white"
            style={{
                backgroundImage: `url(${
                    backgroundImages[type as ValidEnergyType]?.src
                })`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <p
                className="text-3xl leading-[75%] font-normal"
                style={{ letterSpacing: '-0.02em' }}
            >
                Уровень
                <br />
                энергии
            </p>

            <p className="self-end text-3xl leading-[75%] font-normal">
                {level}%
            </p>
        </div>
    );
};

export default EnergyLevelCard;
