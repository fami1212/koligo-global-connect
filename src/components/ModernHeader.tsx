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
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {user && <DesktopHamburgerMenu />}
            <Link to="/" className="flex items-center gap-2">
              <img src={gpConnectLogo} alt="GP Connect" className="h-12" />
              <span className="text-xl font-bold text-primary">GP Connect</span>
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

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard">{t('nav.dashboard')}</Link>
                </Button>
                <Button onClick={signOut} variant="ghost" size="sm">
                  {t('auth.signOut')}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">{t('auth.signIn')}</Link>
                </Button>
                <Button asChild size="sm">
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
