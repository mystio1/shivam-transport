import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Per-pathname, session-only (not persisted across a full reload) — just enough to make
// back/forward feel natural without the complexity of syncing scroll state through history.state.
const scrollPositions = new Map<string, number>();

// A brand-new navigation (clicking a link, a redirect) should land at the top of the new page —
// but going BACK to a list you were scrolled halfway down should return you to that same spot
// instead of dumping you back at the top, which is what plain "always scroll to 0" does.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // Runs on the way OUT of a page (cleanup fires with the pathname that effect instance was
  // created for, i.e. the page being left) — records where the user was before we move.
  useEffect(() => () => {
    scrollPositions.set(pathname, window.scrollY);
  }, [pathname]);

  useEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo(0, scrollPositions.get(pathname) ?? 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
