import React from 'react';
import { Card, CardContent } from './Card';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';
import { useLocale } from '../../localization/useLocale';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    trendType?: 'up' | 'down' | 'neutral';
    iconColor?: string;
    iconBg?: string;
    className?: string;
    onClick?: () => void;
    isActive?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon: Icon,
    trend,
    trendType = 'neutral',
    iconColor = 'text-blue-500',
    className,
    onClick,
    isActive
}) => {
    const { isRTL } = useLocale();

    return (
        <Card
            className={cn(
                "group relative overflow-hidden rounded-3xl border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white dark:bg-gray-900 transition-all duration-300",
                onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(37,99,235,0.15)]" : "hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
                isActive && "ring-2 ring-blue-500",
                className
            )}
            onClick={onClick}
        >
            {/* Animated Background Watermark Icon */}
            <div className={cn(
                "absolute -bottom-4 opacity-10 dark:opacity-20 transition-all duration-500 group-hover:opacity-[0.15] dark:group-hover:opacity-30 group-hover:scale-125 group-hover:-translate-y-2 pointer-events-none",
                isRTL ? "-left-4 group-hover:translate-x-2" : "-right-4 group-hover:-translate-x-2",
                iconColor
            )}>
                <Icon className="w-24 h-24 sm:w-28 sm:h-28" />
            </div>

            <CardContent className="p-5 relative z-10">
                <div className={cn('ui-stat-card flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate transition-colors group-hover:text-gray-500 dark:group-hover:text-gray-400">
                            {label}
                        </p>
                        <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white truncate">
                            {value}
                        </p>
                        {trend && (
                            <p className={cn(
                                "text-[10px] font-bold mt-1",
                                trendType === 'up' ? "text-emerald-500" :
                                trendType === 'down' ? "text-rose-500" : "text-gray-400"
                            )}>
                                {trend}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
