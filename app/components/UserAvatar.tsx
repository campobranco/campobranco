"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserAvatarProps {
    userId?: string;
    name?: string;
    className?: string;
}

export default function UserAvatar({ userId, name, className = "w-6 h-6 text-[10px]" }: UserAvatarProps) {
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState(name || '?');

    useEffect(() => {
        if (!userId) return;

        let isMounted = true;

        // Optimistic check: maybe we already have the photo URL in a global cache? 
        // For now, simpler to just fetch. Firestore SDK caches reads well.
        const fetchUser = async () => {
            try {
                const snap = await getDoc(doc(db, "users", userId));
                if (isMounted && snap.exists()) {
                    const data = snap.data();
                    if (data.photoURL) setPhotoURL(data.photoURL);
                    if (data.name) setDisplayName(data.name);
                }
            } catch (e) {
                // ignore
            }
        };

        fetchUser();

        return () => { isMounted = false; };
    }, [userId]);

    if (photoURL) {
        return (
            <img
                src={photoURL}
                alt={displayName}
                width={24}
                height={24}
                className={`${className} rounded-full object-cover ring-2 ring-white bg-gray-200`}
                title={displayName}
                referrerPolicy="no-referrer"
            />
        );
    }

    return (
        <div
            className={`${className} rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center font-bold text-gray-600`}
            title={displayName}
        >
            {displayName.charAt(0).toUpperCase()}
        </div>
    );
}
