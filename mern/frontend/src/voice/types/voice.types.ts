// Shared types for the voice calling feature

export interface VoicePeer {
  socketId: string;
  userId:   string;
  name:     string;
  isMuted:  boolean;
}

export interface IceConfig {
  iceServers: RTCIceServer[];
}

export interface Channel {
  _id:          string;
  name:         string;
  courseId:     string;
  createdBy:    string;
  participants: Participant[];
  isActive:     boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface Participant {
  userId:   string;
  name:     string;
  role:     "host" | "participant";
  isMuted:  boolean;
  joinedAt: string;
}

export interface UseWebRTCReturn {
  localStream:   MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peers:         VoicePeer[];
  isMuted:       boolean;
  isConnected:   boolean;
  joinChannel:   (channelId: string) => Promise<void>;
  leaveChannel:  () => void;
  toggleMute:    () => void;
}