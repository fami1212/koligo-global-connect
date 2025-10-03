import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Image as ImageIcon, 
  Phone, 
  Video, 
  MoreVertical,
  Search,
  ArrowLeft,
  Check,
  CheckCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  sender_id: string;
  traveler_id: string;
  assignment_id: string;
  updated_at: string;
  other_user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
    read_at: string | null;
  } | null;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

interface WhatsAppMessagingProps {
  preSelectedConversationId?: string;
}

export default function WhatsAppMessaging({ preSelectedConversationId }: WhatsAppMessagingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
      
      const channel = supabase
        .channel('messages-realtime')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);
            loadConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (preSelectedConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === preSelectedConversationId);
      if (conv) setSelectedConversation(conv);
    }
  }, [preSelectedConversationId, conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Remove duplicates based on combination of users
      const uniqueConversations = new Map();
      
      for (const conv of conversationsData || []) {
        const otherUserId = conv.sender_id === user.id ? conv.traveler_id : conv.sender_id;
        const key = [user.id, otherUserId].sort().join('-');
        
        if (!uniqueConversations.has(key) || 
            new Date(conv.updated_at) > new Date(uniqueConversations.get(key).updated_at)) {
          uniqueConversations.set(key, conv);
        }
      }

      const conversationsWithDetails = await Promise.all(
        Array.from(uniqueConversations.values()).map(async (conv) => {
          const otherUserId = conv.sender_id === user.id ? conv.traveler_id : conv.sender_id;
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, avatar_url, is_verified')
            .eq('user_id', otherUserId)
            .single();

          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, read_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: unreadData } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            ...conv,
            other_user: profileData ? {
              id: profileData.user_id,
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              avatar_url: profileData.avatar_url,
              is_verified: profileData.is_verified || false
            } : {
              id: otherUserId,
              first_name: 'Utilisateur',
              last_name: '',
              avatar_url: null,
              is_verified: false
            },
            last_message: lastMessageData,
            unread_count: unreadData?.length || 0
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

      setMessages(messagesData || []);
      
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id || '');
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      setSending(true);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
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

  const uploadImage = async (file: File) => {
    if (!selectedConversation || !user) return;

    try {
      setSending(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${selectedConversation.id}/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('message-images')
        .getPublicUrl(filePath);

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: '📷 Image',
          image_url: urlData.publicUrl,
          image_type: file.type || 'user_upload'
        });

      if (messageError) throw messageError;

      // Reset file input to allow re-uploading the same file name
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'image",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_id !== user?.id) return null;
    
    if (message.read_at) {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    } else {
      return <Check className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredConversations = conversations.filter(conv => 
    searchTerm === '' || 
    `${conv.other_user.first_name} ${conv.other_user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] bg-background border rounded-lg overflow-hidden flex flex-col md:flex-row">
      {/* Conversations List */}
      <div className={cn(
        "border-r transition-all duration-300 flex flex-col",
        isMobile && selectedConversation ? "hidden" : "w-full md:w-80"
      )}>
        <div className="p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={cn(
                  "p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                  selectedConversation?.id === conversation.id && "bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.other_user.avatar_url || ''} />
                      <AvatarFallback>
                        {conversation.other_user.first_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.other_user.is_verified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conversation.other_user.first_name} {conversation.other_user.last_name}
                      </p>
                      {conversation.last_message && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        "text-sm truncate",
                        conversation.unread_count > 0 && conversation.last_message?.sender_id !== user?.id
                          ? "text-primary font-semibold" 
                          : "text-muted-foreground"
                      )}>
                        {conversation.last_message?.content || 'Aucun message'}
                      </p>
                      {conversation.unread_count > 0 && conversation.last_message?.sender_id !== user?.id && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse ml-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.other_user.avatar_url || ''} />
                  <AvatarFallback>
                    {selectedConversation.other_user.first_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedConversation.other_user.first_name} {selectedConversation.other_user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">En ligne</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                          isOwn 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        {message.image_url && (
                          <img 
                            src={message.image_url} 
                            alt="Message" 
                            className="rounded-lg mb-2 max-w-full"
                          />
                        )}
                        <p className="text-sm break-words">{message.content}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <span className="text-xs">
                            {formatTime(message.created_at)}
                          </span>
                          {getMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Tapez un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Sélectionnez une conversation</p>
              <p className="text-sm">pour commencer à discuter</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}