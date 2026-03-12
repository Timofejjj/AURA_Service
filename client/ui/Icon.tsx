import React from 'react';

import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

import { cn } from '@/lib/utils';

type RequiredIconName =
    | 'Home'
    | 'List'
    | 'Plus'
    | 'User'
    | 'SquareStack'
    | 'HelpCircle';

const IconMap: Record<RequiredIconName, React.FC<LucideProps>> = {
    Home: LucideIcons.Home,
    List: LucideIcons.List,
    Plus: LucideIcons.Plus,
    User: LucideIcons.User,
    SquareStack: LucideIcons.SquareStack,
    HelpCircle: LucideIcons.HelpCircle,
};

export type IconName = keyof typeof IconMap;

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: IconName;
    size?: number;
    color?: string;
    className?: string;
}

const Icon = ({
    name,
    size = 24,
    color = 'currentColor',
    className = '',
    ...props
}: IconProps) => {
    const Component = IconMap[name];

    return (
        <Component
            size={size}
            color={color}
            className={cn('flex-shrink-0', className)}
            {...props}
        />
    );
};

export default Icon;
