import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Package, ArrowLeft, Shield, Building2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState('sender');
  const [idType, setIdType] = useState('');

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
    
    // GP specific fields
    const businessName = formData.get('businessName') as string;
    const idValidityDate = formData.get('idValidityDate') as string;
    const idDocument = (e.currentTarget.querySelector('#idDocument') as HTMLInputElement)?.files?.[0];
    
    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      business_name: userType === 'traveler' ? businessName : null,
      id_type: userType === 'traveler' ? idType : null,
      id_validity_date: userType === 'traveler' ? idValidityDate : null,
    });
    
    // Si inscription réussie sans erreur
    if (!error) {
      // Upload document si GP (après inscription)
      if (userType === 'traveler' && idDocument && idType) {
        setTimeout(async () => {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              const fileExt = idDocument.name.split('.').pop();
              const fileName = `${currentUser.id}/${idType}-${Date.now()}.${fileExt}`;
              
              const { error: uploadError } = await supabase.storage
                .from('kyc-documents')
                .upload(fileName, idDocument);
              
              if (!uploadError) {
                await supabase.from('kyc_documents').insert({
                  user_id: currentUser.id,
                  document_type: idType,
                  document_url: fileName,
                  status: 'pending'
                });
              }
            }
          } catch (err) {
            console.error('Error uploading document:', err);
          }
        }, 1000);
      }
    }
    
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
            <h1 className="text-2xl font-bold text-foreground">GP CONNECT</h1>
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
                  {/* User type selection */}
                  <div className="space-y-3">
                    <Label>{t('auth.userType')}</Label>
                    <RadioGroup 
                      value={userType} 
                      onValueChange={setUserType} 
                      className="grid grid-cols-2 gap-3"
                    >
                      <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-all ${userType === 'sender' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                        <RadioGroupItem value="sender" id="sender" />
                        <Label htmlFor="sender" className="cursor-pointer flex items-center gap-2 flex-1">
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium text-sm">{t('auth.sender')}</div>
                            <div className="text-xs text-muted-foreground">{t('auth.senderDesc')}</div>
                          </div>
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-all ${userType === 'traveler' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                        <RadioGroupItem value="traveler" id="traveler" />
                        <Label htmlFor="traveler" className="cursor-pointer flex items-center gap-2 flex-1">
                          <Truck className="h-4 w-4 text-success" />
                          <div>
                            <div className="font-medium text-sm">GP</div>
                            <div className="text-xs text-muted-foreground">Transporteur</div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* GP specific fields */}
                  {userType === 'traveler' && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Building2 className="h-4 w-4" />
                        Informations GP
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Nom d'enseigne</Label>
                        <Input
                          id="businessName"
                          name="businessName"
                          placeholder="Ex: Transport Express Paris"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="idType">Type de pièce d'identité *</Label>
                        <Select value={idType} onValueChange={setIdType} required>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="passport">Passeport</SelectItem>
                            <SelectItem value="national_id">Carte d'identité nationale</SelectItem>
                            <SelectItem value="driver_license">Permis de conduire</SelectItem>
                            <SelectItem value="residence_permit">Titre de séjour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="idValidityDate">Date de validité *</Label>
                        <Input
                          id="idValidityDate"
                          name="idValidityDate"
                          type="date"
                          required={userType === 'traveler'}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="idDocument">Document d'identité *</Label>
                        <div className="relative">
                          <Input
                            id="idDocument"
                            type="file"
                            accept="image/*,.pdf"
                            required={userType === 'traveler'}
                            className="cursor-pointer"
                          />
                          <Upload className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG ou PDF - Max 5MB
                        </p>
                      </div>

                      <Alert className="bg-blue-50 border-blue-200">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-xs">
                          Votre document sera vérifié par notre équipe. Vous pourrez publier des trajets une fois approuvé (24-48h).
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('auth.firstName')} *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        required
                        placeholder={t('auth.firstName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('auth.lastName')} *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        required
                        placeholder={t('auth.lastName')}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')} *</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      required
                      placeholder={t('auth.email')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')} *</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || (userType === 'traveler' && !idType)}
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
