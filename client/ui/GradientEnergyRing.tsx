import { ReactNode } from 'react';

interface GradientEnergyRingProps {
    children: ReactNode;
}

const GradientEnergyRing = ({ children }: GradientEnergyRingProps) => {
    const size = 334;

    return (
        <div
            className="relative mx-auto flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 354 361"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0"
            >
                <defs>
                    <mask id="hole-mask">
                        <rect width="354" height="361" fill="white" />
                        <circle cx="173.393" cy="183.7" r="142" fill="black" />
                    </mask>

                    <filter
                        id="filter0_f_2074_987"
                        x="-4.95911e-05"
                        y="197.806"
                        width="228.89"
                        height="162.232"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                    >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                        />
                        <feGaussianBlur
                            stdDeviation="11.85"
                            result="effect1_foregroundBlur_2074_987"
                        />
                    </filter>
                    <filter
                        id="filter1_f_2074_987"
                        x="124.397"
                        y="1.14441e-05"
                        width="228.89"
                        height="162.232"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                    >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                        />
                        <feGaussianBlur
                            stdDeviation="11.85"
                            result="effect1_foregroundBlur_2074_987"
                        />
                    </filter>
                    <filter
                        id="filter2_f_2074_987"
                        x="7.59331"
                        y="16.8999"
                        width="333.6"
                        height="333.6"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                    >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="BackgroundImageFix"
                            result="shape"
                        />
                        <feGaussianBlur
                            stdDeviation="7.4"
                            result="effect1_foregroundBlur_2074_987"
                        />
                    </filter>
                    <linearGradient
                        id="paint0_linear_2074_987"
                        x1="120.893"
                        y1="291.2"
                        x2="117.393"
                        y2="319.7"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#3D3EEB" />
                        <stop offset="1" stopColor="#D33996" />
                    </linearGradient>
                    <linearGradient
                        id="paint1_linear_2074_987"
                        x1="235.643"
                        y1="136.338"
                        x2="235.643"
                        y2="31.6999"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#892CCF" />
                        <stop offset="1" stopColor="#37C1EA" />
                    </linearGradient>
                    <linearGradient
                        id="paint2_linear_2074_987"
                        x1="174.393"
                        y1="31.6999"
                        x2="174.393"
                        y2="335.7"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#3E01DB" />
                        <stop offset="0.5" stopColor="#892CCF" />
                        <stop offset="1" stopColor="#0511E9" />
                    </linearGradient>
                </defs>

                <g mask="url(#hole-mask)">
                    <g filter="url(#filter0_f_2074_987)">
                        <path
                            d="M31.3933 223.7C43.2266 265.2 94.2933 343.7 203.893 325.7"
                            stroke="url(#paint0_linear_2074_987)"
                            strokeWidth="16"
                        />
                    </g>
                    <g filter="url(#filter1_f_2074_987)">
                        <path
                            d="M321.893 136.338C310.06 94.8384 258.993 16.3384 149.393 34.3384"
                            stroke="url(#paint1_linear_2074_987)"
                            strokeWidth="16"
                        />
                    </g>
                    <g filter="url(#filter2_f_2074_987)">
                        <circle
                            cx="174.393"
                            cy="183.7"
                            r="143"
                            stroke="url(#paint2_linear_2074_987)"
                            strokeWidth="18"
                        />
                    </g>
                </g>
            </svg>

            <div className="relative z-20 text-center">{children}</div>
        </div>
    );
};

export default GradientEnergyRing;
