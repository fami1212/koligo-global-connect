import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, MessageCircle, Image as ImageIcon, Phone, Video, MoreVertical, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url?: string;
  image_type?: string;
  created_at: string;
  read_at: string | null;
  sender_profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

interface Conversation {
  id: string;
  sender_id: string;
  traveler_id: string;
  assignment_id: string;
  created_at: string;
  updated_at: string;
  sender_profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  traveler_profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export function EnhancedMessaging() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setupRealtimeSubscription();
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`sender_id.eq.${user?.id},traveler_id.eq.${user?.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get profiles and last messages
      const senderIds = [...new Set(conversationsData?.map(c => c.sender_id) || [])];
      const travelerIds = [...new Set(conversationsData?.map(c => c.traveler_id) || [])];
      const allUserIds = [...new Set([...senderIds, ...travelerIds])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', allUserIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Get last message and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const [{ data: lastMessage }, { count: unreadCount }] = await Promise.all([
            supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single(),
            supabase
              .from('messages')
              .select('id', { count: 'exact' })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user?.id)
              .is('read_at', null)
          ]);

          return {
            ...conv,
            sender_profile: profilesMap.get(conv.sender_id),
            traveler_profile: profilesMap.get(conv.traveler_id),
            last_message: lastMessage,
            unread_count: unreadCount || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', senderIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const messagesWithProfiles = messagesData?.map(message => ({
        ...message,
        sender_profile: profilesMap.get(message.sender_id)
      })) || [];

      setMessages(messagesWithProfiles);

      // Mark messages as read
      const unreadMessages = messagesData?.filter(msg => msg.sender_id !== user?.id && !msg.read_at);
      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadMessages.map(msg => msg.id));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('message-images')
        .getPublicUrl(fileName);

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: user.id,
          content: 'Image partagée',
          image_url: urlData.publicUrl,
          image_type: file.type
        });

      if (messageError) throw messageError;

      toast({
        title: "Image envoyée",
        description: "L'image a été partagée avec succès",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'image",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (conversation.sender_id === user?.id) {
      return {
        name: `${conversation.traveler_profile?.first_name} ${conversation.traveler_profile?.last_name}`,
        avatar: conversation.traveler_profile?.avatar_url,
        profile: conversation.traveler_profile
      };
    } else {
      return {
        name: `${conversation.sender_profile?.first_name} ${conversation.sender_profile?.last_name}`,
        avatar: conversation.sender_profile?.avatar_url,
        profile: conversation.sender_profile
      };
    }
  };

  const renderConversationsList = () => (
    <Card className={cn("h-full", isMobile && selectedConversation && "hidden")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-250px)]">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherParticipant = getOtherParticipant(conv);
              const isSelected = selectedConversation === conv.id;
              
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
                    isSelected && "bg-muted"
                  )}
                  onClick={() => setSelectedConversation(conv.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherParticipant.avatar} />
                        <AvatarFallback>
                          {otherParticipant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <div className="w-2 h-2 bg-green-500 rounded-full absolute -top-1 -right-1"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm truncate">
                          {otherParticipant.name}
                        </p>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(conv.last_message.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className={cn(
                          "text-xs truncate mt-1",
                          conv.unread_count && conv.unread_count > 0 && conv.last_message.sender_id !== user?.id
                            ? "text-green-600 font-medium"
                            : "text-muted-foreground"
                        )}>
                          {conv.last_message.sender_id === user?.id ? 'Vous: ' : ''}
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderMessagesArea = () => {
    if (!selectedConversation) {
      return (
        <Card className={cn("h-full flex items-center justify-center", isMobile && "hidden")}>
          <CardContent className="text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une conversation pour commencer</p>
          </CardContent>
        </Card>
      );
    }

    const conversation = conversations.find(c => c.id === selectedConversation);
    const otherParticipant = conversation ? getOtherParticipant(conversation) : null;

    return (
      <Card className={cn("h-full flex flex-col", isMobile && !selectedConversation && "hidden")}>
        {/* Header */}
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParticipant?.avatar} />
              <AvatarFallback>
                {otherParticipant?.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{otherParticipant?.name}</p>
              <p className="text-xs text-muted-foreground">En ligne</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 max-w-[80%]",
                    message.sender_id === user?.id ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={message.sender_profile?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {message.sender_profile?.first_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={cn(
                    "flex flex-col gap-1",
                    message.sender_id === user?.id ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl max-w-full",
                      message.sender_id === user?.id
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}>
                      {message.image_url ? (
                        <div className="space-y-2">
                          <img 
                            src={message.image_url} 
                            alt="Image partagée" 
                            className="max-w-64 rounded-lg cursor-pointer"
                            onClick={() => window.open(message.image_url, '_blank')}
                          />
                          {message.content !== 'Image partagée' && (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Tapez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1"
              disabled={sending}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        {renderConversationsList()}
      </div>
      <div className="md:col-span-2">
        {renderMessagesArea()}
      </div>
    </div>
  );
}