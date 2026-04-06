'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    useEffect(() => {
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );
            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            console.debug(`[nav] ${pageName}`);
        }
    }, [pathname, isAuthenticated, Pages, mainPageKey]);

    return null;
}
