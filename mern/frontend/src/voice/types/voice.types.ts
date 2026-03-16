export type VoicePeer = {
  socketId: string;
  userId:   string;
  name:     string;
  isMuted:  boolean;
};

export type IceConfig = {
  iceServers: RTCIceServer[];
};

export type Channel = {
  _id:          string;
  name:         string;
  courseId:     string;
  createdBy:    string;
  participants: Participant[];
  isActive:     boolean;
  createdAt:    string;
  updatedAt:    string;
};

export type Participant = {
  userId:   string;
  name:     string;
  role:     "host" | "participant";
  isMuted:  boolean;
  joinedAt: string;
};

export type UseWebRTCReturn = {
  localStream:   MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peers:         VoicePeer[];
  isMuted:       boolean;
  isConnected:   boolean;
  joinChannel:   (channelId: string) => Promise<void>;
  leaveChannel:  () => void;
  toggleMute:    () => void;
};