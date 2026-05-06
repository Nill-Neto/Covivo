import { useState, useEffect, useRef, useCallback } from 'react';

const DESKTOP_SIDEBAR_STORAGE_KEY = 'app-layout:desktop-sidebar-open';

export function useSidebar() {
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === 'true';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const previousMobileViewport = useRef<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      DESKTOP_SIDEBAR_STORAGE_KEY,
      desktopMenuOpen ? 'true' : 'false'
    );
  }, [desktopMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const syncViewport = () => {
      const isMobile = mediaQuery.matches;
      const wasMobile = previousMobileViewport.current;

      setIsMobileViewport(isMobile);

      if (wasMobile === true && !isMobile) {
        setMobileMenuOpen(false);
      }

      previousMobileViewport.current = isMobile;
    };

    syncViewport();

    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  const handleMenuToggle = useCallback(() => {
    if (isMobileViewport) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setDesktopMenuOpen((prev) => !prev);
    }
  }, [isMobileViewport]);

  const handleNavItemClick = useCallback(() => {
    if (isMobileViewport) {
      setMobileMenuOpen(false);
    }
  }, [isMobileViewport]);

  const isSidebarExpanded = isMobileViewport ? true : desktopMenuOpen;
  const isSidebarVisibleOnMobile = isMobileViewport && mobileMenuOpen;

  return {
    desktopMenuOpen,
    setDesktopMenuOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    isMobileViewport,
    isSidebarExpanded,
    isSidebarVisibleOnMobile,
    handleMenuToggle,
    handleNavItemClick,
  };
}
