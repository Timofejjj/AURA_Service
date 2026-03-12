'use client';

import { ReactNode } from 'react';

export type Item = {
    url: string;
    icon: ReactNode | null;
};

interface NavItemProps {
    item: Item;
    isActive: boolean;
    onClick: (url: string) => void;
}

const NavItem = ({ item, isActive, onClick }: NavItemProps) => {
    if (item.url === 'spacer') {
        return <div className="w-16" />;
    }

    return (
        <button
            onClick={() => onClick(item.url)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                isActive
                    ? 'bg-gradient-to-br from-[#3e01db] to-[#892ccf] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
            } `}
        >
            {item.icon}
        </button>
    );
};

export default NavItem;
