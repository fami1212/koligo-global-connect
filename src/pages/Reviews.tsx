import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface Assignment {
  id: string;
  shipment_id: string;
  trip_id: string;
  traveler_id: string;
  sender_id: string;
  delivery_completed_at: string;
  shipment?: { title: string };
  trip?: { departure_city: string; arrival_city: string };
  traveler?: { first_name: string; last_name: string; avatar_url: string };
  sender?: { first_name: string; last_name: string; avatar_url: string };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { first_name: string; last_name: string; avatar_url: string };
  reviewee?: { first_name: string; last_name: string; avatar_url: string };
}

export default function Reviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingReviews, setPendingReviews] = useState<Assignment[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load completed assignments without reviews
    const { data: assignments } = await supabase
      .from("assignments")
      .select("*")
      .not("delivery_completed_at", "is", null)
      .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`);

    if (assignments) {
      // Filter out assignments that already have reviews from current user
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("assignment_id")
        .eq("reviewer_id", user.id);

      const reviewedAssignmentIds = new Set(existingReviews?.map(r => r.assignment_id) || []);
      const pending = assignments.filter(a => !reviewedAssignmentIds.has(a.id));
      
      // Fetch related data for pending assignments
      if (pending.length > 0) {
        const shipmentIds = pending.map(a => a.shipment_id);
        const tripIds = pending.map(a => a.trip_id);
        const travelerIds = pending.map(a => a.traveler_id);
        const senderIds = pending.map(a => a.sender_id);

        const { data: shipments } = await supabase
          .from("shipments")
          .select("id, title")
          .in("id", shipmentIds);

        const { data: trips } = await supabase
          .from("trips")
          .select("id, departure_city, arrival_city")
          .in("id", tripIds);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, avatar_url")
          .in("user_id", [...travelerIds, ...senderIds]);

        const shipmentMap = new Map(shipments?.map(s => [s.id, s]));
        const tripMap = new Map(trips?.map(t => [t.id, t]));
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

        const enriched = pending.map(a => ({
          ...a,
          shipment: shipmentMap.get(a.shipment_id),
          trip: tripMap.get(a.trip_id),
          traveler: profileMap.get(a.traveler_id),
          sender: profileMap.get(a.sender_id)
        }));

        setPendingReviews(enriched as any);
      } else {
        setPendingReviews([]);
      }
    }

    // Load reviews I wrote with reviewee profiles
    const { data: written } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewer_id", user.id)
      .order("created_at", { ascending: false });

    if (written) {
      // Fetch profiles for reviewees
      const revieweeIds = written.map(r => r.reviewee_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", revieweeIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      const enrichedWritten = written.map(r => ({
        ...r,
        reviewee: profileMap.get(r.reviewee_id)
      }));
      setMyReviews(enrichedWritten as any);
    }

    // Load reviews I received with reviewer profiles
    const { data: received } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewee_id", user.id)
      .order("created_at", { ascending: false });

    if (received) {
      // Fetch profiles for reviewers
      const reviewerIds = received.map(r => r.reviewer_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", reviewerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      const enrichedReceived = received.map(r => ({
        ...r,
        reviewer: profileMap.get(r.reviewer_id)
      }));
      setReceivedReviews(enrichedReceived as any);
    }

    setLoading(false);
  };

  const submitReview = async () => {
    if (!selectedAssignment || rating === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une note",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const revieweeId = selectedAssignment.sender_id === user?.id 
      ? selectedAssignment.traveler_id 
      : selectedAssignment.sender_id;

    const { error } = await supabase.from("reviews").insert({
      assignment_id: selectedAssignment.id,
      reviewer_id: user?.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Votre avis a été publié",
      });
      setSelectedAssignment(null);
      setRating(0);
      setComment("");
      loadData();
    }

    setSubmitting(false);
  };

  const renderStars = (currentRating: number, onRate?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              star <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
            onClick={() => onRate?.(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-4">
        <Skeleton className="h-12 w-48" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Avis & Évaluations</h1>
        <p className="text-muted-foreground">Partagez votre expérience et consultez vos avis</p>
      </div>

      {/* Pending Reviews */}
      {pendingReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>En attente d'avis ({pendingReviews.length})</CardTitle>
            <CardDescription>Partagez votre expérience sur ces livraisons terminées</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingReviews.map((assignment) => {
              const otherUser = assignment.sender_id === user?.id ? assignment.traveler : assignment.sender;
              const isReviewing = selectedAssignment?.id === assignment.id;

              return (
                <Card key={assignment.id} className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={otherUser?.avatar_url || ""} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">
                          {otherUser?.first_name} {otherUser?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.shipment?.title} - {assignment.trip?.departure_city} → {assignment.trip?.arrival_city}
                        </p>

                        {isReviewing ? (
                          <div className="mt-4 space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Note</label>
                              {renderStars(rating, setRating)}
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Commentaire (optionnel)</label>
                              <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Partagez votre expérience..."
                                maxLength={500}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={submitReview} disabled={submitting || rating === 0}>
                                <Send className="h-4 w-4 mr-2" />
                                Publier
                              </Button>
                              <Button variant="outline" onClick={() => {
                                setSelectedAssignment(null);
                                setRating(0);
                                setComment("");
                              }}>
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => setSelectedAssignment(assignment)}
                          >
                            Laisser un avis
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* My Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Mes avis publiés ({myReviews.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myReviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun avis publié</p>
          ) : (
            myReviews.map((review) => (
              <Card key={review.id} className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.reviewee?.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">
                          {review.reviewee?.first_name} {review.reviewee?.last_name}
                        </p>
                        <Badge variant="outline">
                          {new Date(review.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      {renderStars(review.rating)}
                      {review.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Received Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Avis reçus ({receivedReviews.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {receivedReviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun avis reçu</p>
          ) : (
            receivedReviews.map((review) => (
              <Card key={review.id} className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.reviewer?.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">
                          {review.reviewer?.first_name} {review.reviewer?.last_name}
                        </p>
                        <Badge variant="outline">
                          {new Date(review.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      {renderStars(review.rating)}
                      {review.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
