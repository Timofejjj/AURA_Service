const GradientNoteRing = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="290"
            height="290"
            viewBox="0 0 290 290"
            fill="none"
        >
            <defs>
                <mask id="hole_mask">
                    <rect width="100%" height="100%" fill="white" />
                    <circle
                        cx="144.012"
                        cy="143.752"
                        r="97"
                        transform="rotate(55.5812 144.012 143.752)"
                        fill="black"
                    />
                </mask>
                <filter
                    id="filter0_f_2072_986"
                    x="-20"
                    y="-20"
                    width="330"
                    height="330"
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
                        result="effect1_foregroundBlur_2072_986"
                    />
                </filter>
                <filter
                    id="filter1_f_2072_986"
                    x="-20"
                    y="-20"
                    width="330"
                    height="330"
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
                        result="effect1_foregroundBlur_2072_986"
                    />
                </filter>
                <filter
                    id="filter2_f_2072_986"
                    x="0"
                    y="0"
                    width="290"
                    height="290"
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
                        result="effect1_foregroundBlur_2072_986"
                    />
                </filter>
                <linearGradient
                    id="paint0_linear_2072_986"
                    x1="63.202"
                    y1="155.753"
                    x2="45.6587"
                    y2="164.838"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#3D3EEB" />
                    <stop offset="1" stopColor="#D33996" />
                </linearGradient>
                <linearGradient
                    id="paint1_linear_2072_986"
                    x1="194.715"
                    y1="161.137"
                    x2="254.11"
                    y2="120.44"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#892CCF" />
                    <stop offset="1" stopColor="#37C1EA" />
                </linearGradient>
                <linearGradient
                    id="paint2_linear_2072_986"
                    x1="144.577"
                    y1="40.5772"
                    x2="144.577"
                    y2="248.577"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#3E01DB" />
                    <stop offset="0.5" stopColor="#892CCF" />
                    <stop offset="1" stopColor="#0511E9" />
                </linearGradient>
            </defs>
            <g mask="url(#hole_mask)">
                <g filter="url(#filter0_f_2072_986)">
                    <path
                        d="M66.9106 78.9957C47.9299 101.814 23.117 161.162 75.7116 216.008"
                        stroke="url(#paint0_linear_2072_986)"
                        strokeWidth="16"
                    />
                </g>
                <g filter="url(#filter1_f_2072_986)">
                    <path
                        d="M228.064 209.807C247.045 186.989 271.858 127.641 219.263 72.7949"
                        stroke="url(#paint1_linear_2072_986)"
                        strokeWidth="16"
                    />
                </g>
                <g filter="url(#filter2_f_2072_986)">
                    <circle
                        cx="144.577"
                        cy="144.577"
                        r="95"
                        transform="rotate(55.5812 144.577 144.577)"
                        stroke="url(#paint2_linear_2072_986)"
                        strokeWidth="18"
                    />
                </g>
            </g>
        </svg>
    );
};

export default GradientNoteRing;
