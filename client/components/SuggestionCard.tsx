const CloudBackground = () => {
    const cloudPathData =
        'M111.366 3.64556C133.163 12.8906 144.075 37.0446 137.264 59.1918C141.994 59.5852 146.743 60.7237 151.351 62.678C174.625 72.5497 185.49 99.4199 175.618 122.694C171.778 131.75 165.363 138.925 157.588 143.733C159.535 152.665 158.836 162.265 154.996 171.32C145.124 194.595 118.253 205.46 94.9789 195.589C90.4353 193.661 86.3674 191.083 82.8317 188.014C82.5758 188.708 82.304 189.4 82.012 190.089C72.1403 213.363 45.2701 224.228 21.9957 214.356C-1.27863 204.485 -12.1443 177.615 -2.27301 154.341C3.03122 141.835 13.2444 132.913 25.1694 128.865C4.07592 117.995 -5.37748 92.5225 4.0388 70.3209C11.6606 52.3508 29.4161 41.7804 47.8258 42.4383C48.1838 37.5638 49.3344 32.6639 51.349 27.9139C61.2206 4.63943 88.0912 -6.22594 111.366 3.64556Z';

    return (
        <svg
            viewBox="0 0 173 198"
            preserveAspectRatio="xMidYMax slice"
            className="mt-[20%] h-[87%] w-[95%]"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d={cloudPathData}
                fill="transparent"
                stroke="rgba(0, 0, 0, 0.15)"
                strokeWidth="1.5"
            />
        </svg>
    );
};

interface SuggestionCardProps {
    text: string;
}

const SuggestionCard = ({ text }: SuggestionCardProps) => {
    return (
        <div className="relative h-64 w-48 overflow-hidden rounded-2xl border border-black/10 border-t-gray-200 bg-white p-4 [background:linear-gradient(180deg,_#fff_30%,_#0511e9_100%),_linear-gradient(360deg,_rgba(255,255,255,0.2)_0%,_rgba(0,0,0,0.2)_100%)]">
            <div className="absolute inset-0 z-0">
                <CloudBackground />
            </div>

            <h3 className="relative z-10 text-xl leading-tight text-black">
                {text}
            </h3>
        </div>
    );
};

export default SuggestionCard;
