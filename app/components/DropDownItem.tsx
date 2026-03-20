"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DropDownItemProps {
    onClick: (e: React.MouseEvent) => void;
    icon: LucideIcon;
    label: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'indigo' | 'orange';
    className?: string;
}

const variantStyles = {
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
};

const textStyles = {
    primary: 'hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    success: 'hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    warning: 'hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
    danger: 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
    neutral: 'hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50',
    indigo: 'hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
    orange: 'hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
};

export default function DropDownItem({
    onClick,
    icon: Icon,
    label,
    variant = 'neutral',
    className = ''
}: DropDownItemProps) {
    const isDestructive = variant === 'danger' || variant === 'orange';
    
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all w-full text-left rounded-xl group ${textStyles[variant]} ${isDestructive ? (variant === 'danger' ? 'text-red-600' : 'text-orange-600') : 'text-gray-700 dark:text-gray-300'} ${className}`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${variantStyles[variant]}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className="truncate">{label}</span>
        </button>
    );
}
