import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    await signIn(email, password);
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const userType = formData.get('userType') as string;
    
    await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      user_type: userType
    });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">KoliGo</h1>
          </div>
          <p className="text-muted-foreground">
            {t('auth.welcomeBack')}
          </p>
        </div>

        <Card className="border-0 shadow-elegant">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{t('auth.welcomeBack')}</CardTitle>
            <CardDescription>
              {t('auth.signIn')} {t('common.or')} {t('auth.createAccount')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      required
                      placeholder={t('auth.email')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    variant="default"
                  >
                    {isLoading ? `${t('common.loading')}` : t('auth.signIn')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        required
                        placeholder={t('auth.firstName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        required
                        placeholder={t('auth.lastName')}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      required
                      placeholder={t('auth.email')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>{t('auth.userType')}</Label>
                    <RadioGroup name="userType" defaultValue="sender" className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="sender" id="sender" />
                        <Label htmlFor="sender" className="cursor-pointer flex items-center gap-2 flex-1">
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">{t('auth.sender')}</div>
                            <div className="text-xs text-muted-foreground">{t('auth.senderDesc')}</div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                        <RadioGroupItem value="traveler" id="traveler" />
                        <Label htmlFor="traveler" className="cursor-pointer flex items-center gap-2 flex-1">
                          <Truck className="h-4 w-4 text-success" />
                          <div>
                            <div className="font-medium">{t('auth.traveler')}</div>
                            <div className="text-xs text-muted-foreground">{t('auth.travelerDesc')}</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                    variant="default"
                  >
                    {isLoading ? `${t('common.loading')}` : t('auth.createAccount')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>{t('auth.termsAgreement')}</p>
        </div>
      </div>
    </div>
  );
}