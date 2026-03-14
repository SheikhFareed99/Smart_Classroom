import { io as Client } from "socket.io-client";

const SERVER = "http://localhost:4001";
const CHANNEL = "69b5ed35b176ad232b273011";

// ── Student A connects first ───────────────────────────────
const studentA = Client(SERVER, { transports: ["websocket"] });

studentA.on("connect", () => {
  console.log("[A] connected:", studentA.id);

  studentA.emit("join-channel", {
    channelId: CHANNEL,
    userId:    "user_A",
    name:      "Student A",
  });
});

// A should receive user-joined when B joins
studentA.on("user-joined", (data) => {
  console.log("[A] user-joined received:", data);
});

// A should receive offer from B
studentA.on("offer", (data) => {
  console.log("[A] offer received from:", data.senderSocketId);
  // In real usage A would respond with an answer — skipping for this test
});

studentA.on("user-left", (data) => {
  console.log("[A] user-left received:", data);
});

// ── Student B connects 1 second later ────────────────────
setTimeout(() => {
  const studentB = Client(SERVER, { transports: ["websocket"] });

  studentB.on("connect", () => {
    console.log("[B] connected:", studentB.id);

    studentB.emit("join-channel", {
      channelId: CHANNEL,
      userId:    "user_B",
      name:      "Student B",
    });
  });

  // B should receive existing-users with A in it
  studentB.on("existing-users", (users) => {
    console.log("[B] existing-users received:", users);
  });

  // B leaves after 2 seconds
  setTimeout(() => {
    console.log("[B] leaving channel...");
    studentB.emit("leave-channel", { channelId: CHANNEL });
    setTimeout(() => {
      studentA.disconnect();
      studentB.disconnect();
      console.log("\n✓ Test complete — check logs above match expected output");
      process.exit(0);
    }, 500);
  }, 2000);

}, 1000);