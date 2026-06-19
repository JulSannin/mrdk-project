import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../widgets/header/Header';
import { Footer } from '../widgets/footer/Footer';
import { AuthProvider } from '../shared/ui/AuthContext';
import { BviPanel } from '../shared/ui/BviPanel';
import { useBvi } from '../shared/ui/BviContext';
import { ConsentBanner } from '../widgets/consentBanner/ConsentBanner';
import { useYandexMetrika } from '../shared/analytics/useYandexMetrika';

export default function RootLayout() {
  const { pathname } = useLocation();
  const topbarRef = useRef<HTMLDivElement>(null);
  const hideChrome = pathname === '/login' || pathname.startsWith('/admin');
  const bvi = useBvi();

  useYandexMetrika();

  // при переходе на другой путь (клик по карточке, навигация) — наверх страницы.
  // пагинация меняет только ?page, путь не трогает, поэтому сюда не попадает.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Высоту липкой полосы (панель BVI + шапка) кладём в --topbar-h, чтобы
  // бургер-меню на мобилке открывалось ровно под ней, а не поверх панели.
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hideChrome]);

  // BVI не должен влиять на админку и логин: мастер-атрибут data-bvi включаем
  // только на публичных страницах (стили BVI завязаны на html[data-bvi='on']).
  useEffect(() => {
    const el = document.documentElement;
    if (bvi.enabled && !hideChrome) el.dataset.bvi = 'on';
    else delete el.dataset.bvi;
  }, [bvi.enabled, hideChrome]);

  if (hideChrome) {
    return (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="topbar" ref={topbarRef}>
        <BviPanel />
        <Header />
      </div>
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
      <ConsentBanner />
    </AuthProvider>
  );
}