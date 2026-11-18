import React from 'react';
import { cn } from '../../utils/cn';
import { useLocale } from '../../localization/useLocale';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className }) => {
    const { direction } = useLocale();

    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2563EB] text-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-blue-500/20 mb-8",
            direction === 'rtl' && "sm:flex-row-reverse",
            className
        )}>
            <div className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
                {description && <p className="mt-1 text-sm text-blue-100 opacity-90">{description}</p>}
            </div>
            {actions && (
                <div className={cn("flex items-center gap-2 sm:gap-3 banner-actions", direction === 'rtl' && "flex-row-reverse")}>
                    {actions}
                </div>
            )}
        </div>
    );
};
