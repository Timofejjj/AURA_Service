const FolderShape = ({ className }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 172 117"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient
                    id="paint0_linear_96_161"
                    x1="86"
                    y1="0"
                    x2="86"
                    y2="117"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#030A83" />
                    <stop offset="1" stopColor="#0511E9" />
                </linearGradient>
            </defs>
            <path
                d="M54.5697 0H16C7.16344 0 0 7.16344 0 16V101C0 109.837 7.16344 117 16 117H156C164.837 117 172 109.837 172 101V32.2564C172 23.4198 164.837 16.2564 156 16.2564H86.2197C82.6105 16.2564 79.1073 15.0361 76.2792 12.7938L64.5102 3.46258C61.6821 1.22027 58.1789 0 54.5697 0Z"
                fill="url(#paint0_linear_96_161)"
            />
        </svg>
    );
};

export default FolderShape;
