import withPWA from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

const pwaConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
});

const nextConfig: NextConfig = {};

export default pwaConfig(nextConfig);
