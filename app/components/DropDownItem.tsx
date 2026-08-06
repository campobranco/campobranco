"use client";

import React from 'react';

interface DropDownItemProps {
    onClick: (e: React.MouseEvent) => void;
    icon: any;
    label: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'indigo' | 'orange';
    className?: string;
}

const variantStyles = {
    primary: 'text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/20',
    success: 'text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20',
    warning: 'text-gray-700 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/20',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20',
    neutral: 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/70',
    indigo: 'text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20',
    orange: 'text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 dark:hover:bg-orange-500/20'
};

const iconStyles = {
    primary: 'text-blue-500 dark:text-blue-400',
    success: 'text-emerald-500 dark:text-emerald-400',
    warning: 'text-amber-500 dark:text-amber-400',
    danger: 'text-red-500 dark:text-red-400',
    neutral: 'text-gray-400 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200',
    indigo: 'text-indigo-500 dark:text-indigo-400',
    orange: 'text-orange-500 dark:text-orange-400'
};

export default function DropDownItem({
    onClick,
    icon,
    label,
    variant = 'neutral',
    className = ''
}: DropDownItemProps) {
    const isImageIcon = typeof icon === 'string';
    
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors w-full text-left rounded-lg group ${variantStyles[variant]} ${className}`}
        >
            {isImageIcon ? (
                <img src={icon} alt={label} className="w-4 h-4 object-contain rounded shrink-0" />
            ) : (
                React.createElement(icon, { className: `w-4 h-4 shrink-0 transition-colors ${iconStyles[variant]}` })
            )}
            <span className="truncate">{label}</span>
        </button>
    );
}
