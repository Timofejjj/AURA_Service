import GradientNoteRing from '@/ui/GradientNoteRing';

const AppointmentCard = () => {
    return (
        <div className="relative flex h-[136px] w-full items-center overflow-hidden rounded-lg border border-[rgba(62,1,219,0.1)] bg-white">
            <div className="absolute top-1/2 right-[-125px] -translate-y-1/2 scale-[0.6]">
                <GradientNoteRing />
            </div>

            <div className="relative z-10 pl-[18px]">
                <h2 className="w-[160px] text-[32px] leading-[75%] font-normal tracking-[-0.02em] text-[#3e01db]">
                    Пора сделать запись!
                </h2>
                <div className="mt-4">
                    <svg
                        width="125"
                        height="6"
                        viewBox="0 0 125 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M125 2.88672L120 5.77344V3.38672H0V2.38672H120V0L125 2.88672Z"
                            fill="#3E01DB"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default AppointmentCard;
