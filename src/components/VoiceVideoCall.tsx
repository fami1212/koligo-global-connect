import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface VoiceVideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  callType: 'audio' | 'video';
}

export function VoiceVideoCall({ 
  isOpen, 
  onClose, 
  conversationId, 
  otherUserId, 
  otherUserName,
  callType: initialCallType 
}: VoiceVideoCallProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [callType, setCallType] = useState(initialCallType);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      initializeCall();
    } else {
      endCall();
    }

    return () => {
      endCall();
    };
  }, [isOpen]);

  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      // Create call log entry
      const { data: callLog, error: callError } = await supabase
        .from('call_logs')
        .insert({
          conversation_id: conversationId,
          caller_id: user?.id,
          callee_id: otherUserId,
          call_type: callType,
          status: 'initiated'
        })
        .select()
        .single();

      if (callError) throw callError;
      setCurrentCallId(callLog.id);

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        if (state === 'connected') {
          setCallStatus('connected');
          updateCallStatus('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          setCallStatus('ended');
          updateCallStatus('ended');
        }
      };

      // Simulate call connection (in real implementation, this would involve signaling)
      setTimeout(() => {
        if (callStatus === 'calling') {
          setCallStatus('connected');
          updateCallStatus('connected');
        }
      }, 3000);

      toast({
        title: "Appel initié",
        description: `Appel ${callType === 'video' ? 'vidéo' : 'audio'} en cours avec ${otherUserName}`,
      });

    } catch (error) {
      console.error('Error initializing call:', error);
      toast({
        title: "Erreur d'appel",
        description: "Impossible d'initier l'appel. Vérifiez vos permissions.",
        variant: "destructive",
      });
      onClose();
    }
  };

  const updateCallStatus = async (status: string) => {
    if (!currentCallId) return;

    try {
      const updates: any = { status };
      
      if (status === 'ended') {
        updates.ended_at = new Date().toISOString();
        updates.duration_seconds = callDuration;
      }

      await supabase
        .from('call_logs')
        .update(updates)
        .eq('id', currentCallId);
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  };

  const endCall = async () => {
    try {
      // Stop media tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Update call status
      if (currentCallId && callStatus !== 'ended') {
        await updateCallStatus('ended');
      }

      // Clear timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      setCallStatus('ended');
      setCallDuration(0);
      setCurrentCallId(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isAudioMuted;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current && callType === 'video') {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoMuted;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const switchToVideo = async () => {
    if (callType === 'audio') {
      try {
        // Get video stream
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
        
        // Replace audio-only stream with video stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        mediaStreamRef.current = videoStream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = videoStream;
        }

        setCallType('video');
        
        toast({
          title: "Vidéo activée",
          description: "L'appel a été converti en appel vidéo",
        });
      } catch (error) {
        console.error('Error switching to video:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'activer la vidéo",
          variant: "destructive",
        });
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    endCall();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {callType === 'video' ? (
                <Video className="h-5 w-5 text-primary" />
              ) : (
                <Phone className="h-5 w-5 text-primary" />
              )}
              <span>
                Appel {callType === 'video' ? 'vidéo' : 'audio'} avec {otherUserName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={callStatus === 'connected' ? 'default' : 'secondary'}>
                {callStatus === 'calling' ? 'Appel en cours...' : 
                 callStatus === 'connected' ? `Connecté - ${formatDuration(callDuration)}` : 
                 'Appel terminé'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative">
          {callType === 'video' ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Remote video */}
              <Card className="bg-black relative overflow-hidden">
                <CardContent className="p-0 h-full">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-sm font-medium">{otherUserName}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Local video */}
              <Card className="bg-black relative overflow-hidden">
                <CardContent className="p-0 h-full">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-sm font-medium">Vous</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="w-80">
                <CardContent className="text-center py-12">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{otherUserName}</h3>
                  <p className="text-muted-foreground">
                    {callStatus === 'calling' ? 'Appel en cours...' : 
                     callStatus === 'connected' ? formatDuration(callDuration) : 
                     'Appel terminé'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center gap-4 pt-4 border-t">
          <Button
            variant={isAudioMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            onClick={toggleAudio}
          >
            {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {callType === 'video' && (
            <Button
              variant={isVideoMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={toggleVideo}
            >
              {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          {callType === 'audio' && (
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              onClick={switchToVideo}
            >
              <Video className="h-6 w-6" />
            </Button>
          )}

          <Button
            variant={isSpeakerOn ? "secondary" : "outline"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          >
            {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            onClick={handleClose}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}