'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAccessToken } from '@/api/axios-instance';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/'];

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));

    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            if (PUBLIC_PATHS.includes(pathname)) {
                setIsAuthorized(true);
                return;
            }

            const token = getAccessToken();

            if (!token) {
                setIsAuthorized(false);
                router.replace('/auth/login');
            } else {
                setIsAuthorized(true);
            }
        };

        checkAuth();

        const handleLogout = () => {
            setIsAuthorized(false);
            router.replace('/auth/login');
        };

        window.addEventListener('auth:logout', handleLogout);

        return () => {
            window.removeEventListener('auth:logout', handleLogout);
        };
    }, [router, pathname]);

    return (
        <QueryClientProvider client={queryClient}>
            {isAuthorized || PUBLIC_PATHS.includes(pathname) ? (
                children
            ) : (
                <div className="flex h-screen w-full items-center justify-center bg-white">
                    <div className="text-gray-500">Проверка доступа...</div>
                </div>
            )}
        </QueryClientProvider>
    );
}