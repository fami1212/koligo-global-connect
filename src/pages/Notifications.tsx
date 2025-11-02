import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Package, Truck, MessageSquare, AlertCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const allNotifications: Notification[] = [];

    // Load new messages
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, updated_at")
      .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (conversations) {
      for (const conv of conversations) {
        const { data: messages } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .neq("sender_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (messages && messages.length > 0) {
          allNotifications.push({
            id: `msg-${messages[0].id}`,
            type: "message",
            title: "Nouveau message",
            message: messages[0].content.substring(0, 50) + "...",
            link: "/messages",
            read: false,
            created_at: messages[0].created_at,
          });
        }
      }
    }

    // Load pending offers (for senders)
    const { data: offers } = await supabase
      .from("offers")
      .select("*")
      .eq("sender_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    offers?.forEach((offer) => {
      allNotifications.push({
        id: `offer-${offer.id}`,
        type: "offer",
        title: "Nouvelle offre",
        message: `Offre reçue: ${offer.proposed_price}€`,
        link: "/my-shipments",
        read: false,
        created_at: offer.created_at,
      });
    });

    // Load pending match requests (for travelers)
    const { data: requests } = await supabase
      .from("match_requests")
      .select("*")
      .eq("traveler_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    requests?.forEach((request) => {
      allNotifications.push({
        id: `request-${request.id}`,
        type: "request",
        title: "Nouvelle demande",
        message: `Demande de réservation reçue`,
        link: "/my-trips",
        read: false,
        created_at: request.created_at,
      });
    });

    // Load pending reviews
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, delivery_completed_at")
      .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
      .not("delivery_completed_at", "is", null)
      .order("delivery_completed_at", { ascending: false })
      .limit(5);

    if (assignments) {
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("assignment_id")
        .eq("reviewer_id", user.id);

      const reviewedIds = new Set(existingReviews?.map(r => r.assignment_id) || []);
      
      assignments
        .filter(a => !reviewedIds.has(a.id))
        .forEach((assignment) => {
          allNotifications.push({
            id: `review-${assignment.id}`,
            type: "review",
            title: "Avis en attente",
            message: "Laissez un avis sur cette livraison",
            link: "/reviews",
            read: false,
            created_at: assignment.delivery_completed_at!,
          });
        });
    }

    // Sort by date
    allNotifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(allNotifications);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "offer":
      case "request":
        return <Package className="h-5 w-5" />;
      case "review":
        return <Star className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl space-y-4">
        <Skeleton className="h-12 w-48" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">Restez informé de votre activité</p>
        </div>
        {notifications.some(n => !n.read) && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucune notification</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.read ? "bg-primary/5 border-primary/20" : ""
              }`}
              onClick={() => {
                if (notification.link) {
                  navigate(notification.link);
                }
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 ${!notification.read ? "text-primary" : "text-muted-foreground"}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{notification.title}</p>
                      {!notification.read && (
                        <Badge className="shrink-0">Nouveau</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
