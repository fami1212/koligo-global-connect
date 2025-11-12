import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Star, MapPin, Phone, Mail, Camera, Save, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { KYCUpload } from '@/components/KYCUpload';

interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  city: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  is_verified?: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    first_name: string;
    last_name: string;
  };
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      setProfileData(profile as ProfileData);
      loadReviews();
    }
  }, [user, profile, navigate]);

  const loadReviews = async () => {
    try {
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get reviewer profiles
      const reviewerIds = [...new Set(reviewsData?.map(r => r.reviewer_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', reviewerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const reviewsWithProfiles = reviewsData?.map(review => ({
        ...review,
        reviewer: profilesMap.get(review.reviewer_id) || { first_name: '', last_name: '' }
      })) || [];

      setReviews(reviewsWithProfiles);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const updateProfile = async () => {
    if (!profileData || !user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone: profileData.phone,
          country: profileData.country,
          city: profileData.city,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(`${user.id}/${fileName}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({
        title: "Avatar mis à jour",
        description: "Votre photo de profil a été mise à jour",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mon Profil</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos informations personnelles
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="self-end sm:self-auto">
            <Link to="/dashboard">
              <span className="hidden sm:inline">Retour au tableau de bord</span>
              <span className="sm:hidden">Retour</span>
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11">
            <TabsTrigger value="profile" className="text-xs sm:text-sm">Profil</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">Avis ({reviews.length})</TabsTrigger>
            <TabsTrigger value="kyc" className="text-xs sm:text-sm">Vérification</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                      <AvatarImage src={profileData.avatar_url} />
                      <AvatarFallback className="text-base sm:text-lg">
                        {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                      <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  </div>
                  
                  <div className="text-center md:text-left w-full">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">
                      {profileData.first_name} {profileData.last_name}
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground truncate">{profileData.email}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Star className="h-3 w-3" />
                        {profileData.rating.toFixed(1)} ({profileData.total_reviews} avis)
                      </Badge>
                      {profileData.is_verified && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          ✓ Vérifié
                        </Badge>
                      )}
                      {profileData.city && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{profileData.city}, {profileData.country}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Informations personnelles</CardTitle>
                <CardDescription className="text-sm">
                  Mettez à jour vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                      id="first_name"
                      value={profileData.first_name || ''}
                      onChange={(e) => setProfileData(prev => prev ? {...prev, first_name: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                      id="last_name"
                      value={profileData.last_name || ''}
                      onChange={(e) => setProfileData(prev => prev ? {...prev, last_name: e.target.value} : null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone || ''}
                    onChange={(e) => setProfileData(prev => prev ? {...prev, phone: e.target.value} : null)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country" className="text-sm">Pays</Label>
                    <Input
                      id="country"
                      value={profileData.country || ''}
                      onChange={(e) => setProfileData(prev => prev ? {...prev, country: e.target.value} : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-sm">Ville</Label>
                    <Input
                      id="city"
                      value={profileData.city || ''}
                      onChange={(e) => setProfileData(prev => prev ? {...prev, city: e.target.value} : null)}
                    />
                  </div>
                </div>

                <Button onClick={updateProfile} disabled={saving} className="w-full h-11 sm:h-10">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 sm:space-y-6">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 sm:py-12 px-4">
                  <Star className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm sm:text-base text-muted-foreground">Aucun avis pour le moment</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    Commencez à utiliser KoliGo pour recevoir vos premiers avis
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {review.reviewer.first_name[0]}{review.reviewer.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">
                              {review.reviewer.first_name} {review.reviewer.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('fr-FR', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < review.rating ? 'text-yellow-500 fill-current' : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="kyc" className="space-y-4 sm:space-y-6">
            <KYCUpload />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}