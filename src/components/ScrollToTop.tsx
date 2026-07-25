import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Every navigation should land at the top of the new page, not wherever the previous
// page's scroll position happened to be (React Router doesn't do this automatically).
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
