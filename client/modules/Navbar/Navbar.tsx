'use client';

import { useEffect, useState } from 'react';

import ActionsMenu from '@/modules/Navbar/components/ActionsMenu';
import BookIcon from '@/ui/icons/BookIcon';
import HomeIcon from '@/ui/icons/HomeIcon';
import { AnimatePresence, motion } from 'framer-motion';
import { Server, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import AddButton from './components/AddButton';
import NavigationMenu from './components/NavigationMenu';

const navItems = [
    { url: '', icon: <HomeIcon className={'h-6 w-6'} /> },
    { url: 'records', icon: <BookIcon className={'h-6 w-6'} /> },
    { url: 'spacer', icon: null },
    { url: 'tasks', icon: <Server size={24} /> },
    { url: 'profile', icon: <User size={24} /> },
];

const NavBar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    const activeTab = usePathname().split('/')[1] || '';

    const changeTab = (tab: string) => {
        router.push(`/${tab}`);
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    useEffect(() => {
        const mainElement = document.querySelector('main');

        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
            mainElement?.classList.add('blur');
        } else {
            document.body.style.overflow = 'auto';
            mainElement?.classList.remove('blur');
        }

        return () => {
            document.body.style.overflow = 'auto';
            mainElement?.classList.remove('blur');
        };
    }, [isMenuOpen]);

    return (
        <div className="fixed bottom-4 left-0 z-50 w-full px-4">
            <div className="relative mx-auto w-full max-w-sm">
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ActionsMenu />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative rounded-full bg-white shadow-lg">
                    <AddButton onClick={toggleMenu} />
                    <NavigationMenu
                        navItems={navItems}
                        activeItem={activeTab}
                        onNavItemClick={changeTab}
                    />
                </div>
            </div>
        </div>
    );
};

export default NavBar;
