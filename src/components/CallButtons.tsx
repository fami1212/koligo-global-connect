import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { VoiceVideoCall } from '@/components/VoiceVideoCall';

interface Assignment {
  id: string;
  sender_id: string;
  traveler_id: string;
  sender_profile?: {
    first_name: string;
    last_name: string;
  };
  traveler_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface CallButtonsProps {
  assignment: Assignment;
  currentUserId?: string;
}

export function CallButtons({ assignment, currentUserId }: CallButtonsProps) {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');

  // Determine the other user based on current user
  const isCurrentUserSender = currentUserId === assignment.sender_id;
  const otherUserId = isCurrentUserSender ? assignment.traveler_id : assignment.sender_id;
  const otherUserProfile = isCurrentUserSender 
    ? assignment.traveler_profile 
    : assignment.sender_profile;
  const otherUserName = otherUserProfile 
    ? `${otherUserProfile.first_name} ${otherUserProfile.last_name}`
    : 'Utilisateur';

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsCallOpen(true);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => startCall('audio')}
        className="flex-1 sm:flex-none"
      >
        <Phone className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Appeler</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => startCall('video')}
        className="flex-1 sm:flex-none"
      >
        <Video className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Vidéo</span>
      </Button>

      <VoiceVideoCall
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        conversationId={assignment.id}
        otherUserId={otherUserId}
        otherUserName={otherUserName}
        callType={callType}
      />
    </>
  );
}