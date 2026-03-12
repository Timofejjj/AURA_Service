import type { FC, ReactNode } from 'react';

import BookIcon from '@/ui/icons/BookIcon';
import { Server } from 'lucide-react';

type MenuItem = {
    label: string;
    icon: ReactNode;
};

const ActionsMenu = () => {
    const menuItems: MenuItem[] = [
        { label: 'Сделать запись', icon: <BookIcon /> },
        { label: 'Трекер', icon: <Server /> },
        { label: 'Задача', icon: null },
    ];

    return (
        <div className="relative bottom-[15px] w-full drop-shadow-lg">
            <div className="absolute top-0 left-0 h-full w-full text-white">
                <svg
                    viewBox="0 0 367 153"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                >
                    <path d="M143.205 153H25.6C16.6392 153 12.1587 153 8.73615 151.256C5.72556 149.722 3.27787 147.274 1.7439 144.264C0 140.841 0 136.361 0 127.4V25.6C0 16.6392 0 12.1587 1.7439 8.73615C3.27787 5.72556 5.72556 3.27787 8.73615 1.7439C12.1587 0 16.6392 0 25.6 0H341.4C350.361 0 354.841 0 358.264 1.7439C361.274 3.27787 363.722 5.72556 365.256 8.73615C367 12.1587 367 16.6392 367 25.6V127.4C367 136.361 367 140.841 365.256 144.264C363.722 147.274 361.274 149.722 358.264 151.256C354.841 153 350.366 153 341.416 153H230.307C227.695 153 226.389 153 225.279 152.844C224.067 152.673 223.537 152.547 222.378 152.154C221.316 151.795 219.629 150.945 216.255 149.246L216.254 149.246C193.221 137.647 170.899 142.81 156.799 149.552C153.53 151.116 151.895 151.897 150.875 152.226C149.755 152.588 149.261 152.7 148.095 152.857C147.032 153 145.757 153 143.205 153Z" />
                </svg>
            </div>

            <div className="relative z-10 space-y-3 px-6 py-6 text-black">
                {menuItems.map((item) => (
                    <button
                        key={item.label}
                        className="flex w-full items-center justify-between rounded-lg text-lg transition-colors hover:bg-gray-100"
                    >
                        <span className={'sans text-xl font-medium'}>
                            {item.label}
                        </span>
                        <span className="text-gray-500">{item.icon}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ActionsMenu;
