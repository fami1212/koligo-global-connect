import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { DesktopHamburgerMenu } from '@/components/DesktopHamburgerMenu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import gpConnectLogo from '@/assets/gp_connect-removebg-preview.png';

const ModernHeader = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 right-0 z-50 border-b">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {user && <DesktopHamburgerMenu />}
            <Link to="/" className="flex items-center gap-1 sm:gap-2 min-w-0">
              <img src={gpConnectLogo} alt="GP Connect" className="h-8 sm:h-12 shrink-0" />
              <span className="text-base sm:text-xl font-bold text-primary truncate hidden xs:inline">GP Connect</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.dashboard')}
            </Link>
            <Link to="/search-trips" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.searchTrips')}
            </Link>
            <Link to="/traveler/create-trip" className="text-sm font-medium hover:text-primary transition-colors">
              {t('nav.createTrip')}
            </Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {user ? (
              <>
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link to="/dashboard">{t('nav.dashboard')}</Link>
                </Button>
                <Button onClick={signOut} variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  {t('auth.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Link to="/auth">{t('auth.signIn')}</Link>
                </Button>
                <Button asChild size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Link to="/auth">{t('auth.signUp')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;
