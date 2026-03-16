// Singleton in-memory participant store.
// Tracks who is currently connected across all channels.
// This is the real-time source of truth — MongoDB is kept
// in sync but this map is used for all live lookups.

export interface SocketUser {
  userId:    string;
  channelId: string;
  name:      string;
  isMuted:   boolean;
  joinedAt:  Date;
}

// socketId → SocketUser
const store = new Map<string, SocketUser>();

// ── Add a participant when they join ──────────────────────
export const addParticipant = (
  socketId: string,
  user: Omit<SocketUser, 'isMuted' | 'joinedAt'>
): void => {
  store.set(socketId, {
    ...user,
    isMuted:  false,
    joinedAt: new Date(),
  });
};

// ── Remove a participant when they leave ──────────────────
export const removeParticipant = (socketId: string): SocketUser | undefined => {
  const user = store.get(socketId);
  store.delete(socketId);
  return user; // returns the removed user so callers can use it
};

// ── Get one participant by socketId ───────────────────────
export const getParticipant = (socketId: string): SocketUser | undefined => {
  return store.get(socketId);
};

// ── Get all participants in a channel ─────────────────────
export const getParticipantsInChannel = (channelId: string) => {
  const participants: Array<{ socketId: string } & SocketUser> = [];

  store.forEach((user, socketId) => {
    if (user.channelId === channelId) {
      participants.push({ socketId, ...user });
    }
  });

  return participants;
};

// ── Update mute state for a participant ───────────────────
export const setMuted = (socketId: string, isMuted: boolean): void => {
  const user = store.get(socketId);
  if (user) {
    store.set(socketId, { ...user, isMuted });
  }
};

// ── Get total connected count (useful for logging) ────────
export const getConnectedCount = (): number => store.size;