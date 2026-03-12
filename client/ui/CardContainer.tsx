import React from 'react';

import { cn } from '@/lib/utils';

interface CardContainerProps {
    children: React.ReactNode;
    className?: string;
    as?: 'div' | 'a' | 'button' | 'section';
    shadow?: boolean;
}

const CardContainer = ({
    children,
    className = '',
    as: Component = 'div',
    shadow = true,
    ...props
}: CardContainerProps) => {
    const baseStyles = 'bg-white rounded-xl';

    const shadowStyles = shadow ? 'shadow-md' : '';

    const combinedClassName = cn(baseStyles, shadowStyles, className);

    return (
        <Component className={combinedClassName} {...props}>
            {children}
        </Component>
    );
};

export default CardContainer;
