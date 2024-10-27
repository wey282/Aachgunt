import { io } from 'socket.io-client';

// Connect to the Socket.IO server (update with the actual server URL)
const socket = io("0.0.0.0:3001", {
  transports: ['websocket'],
  path: '/socket',
  withCredentials: true,
  auth: {
      token: import.meta.env.VITE_SOCKET_TOKEN
  },
});
var connected = false;

var instanceId;
var updatePlayerPositions;
var updatePlayerLeft;
var updateConnection;
var onPlayerDeath;
var log;

socket.on("connect", () => {
  connected = true;
  console.log("Socket io connected! LOOK AT ME");
  updateConnection(true);
});

socket.on("connect_error", (err) => {
  console.log(`connect_error due to ${err.message}`);
  console.log(`description: ${err.description}`);
  console.log(`context: ${err.context}`);
  console.log(`stack: ${err.stack}`);
  reconnect()
});

async function reconnect() {
  for (let i = 0; i < 10; i++) {
    console.log("WAITING 5 SEC!");
  }
  await sleep(5000);
  for (let i = 0; i < 10; i++) {
    console.log("SECOND CONNECTION ATEMPT!");
  }
  socket.connect();
}

export function setInstanceId(id) {
  instanceId = id;
}

export function setLog(o) {
  log = o;
}

export function setUpdatePlayerPositions(f) {
  updatePlayerPositions = f;
}

export function setUpdatePlayerLeft(f) {
  updatePlayerLeft = f;
}

export function setUpdateConnection(c) {
  updateConnection = c;
}

export function setOnPlayerDeath(f) {
  onPlayerDeath = f;
}

export function playerDied() {
  socket.emit("playerDied", {});
}

export async function startUp() {
  log("starting up socketIO, socket connected " + connected);

// Listen for updates about other players' positions
  socket.on('update-players', (player) => {
    log('Received player positions: ' + player);
    updatePlayerPositions(player); // You will implement this function
  });

  socket.on('player-update', (data) => {
    log(data.id + ": " + data.x + ", " + data.y);
  });

  socket.on('on-join-instance', (_instanceId => {
    log("ON JOIN INSTANCE" + _instanceId + " = " + instanceId);
  }))

  socket.on('playerDied', (object) => {
    onPlayerDeath();
  })

  // Join the specific instance
  socket.emit('join-instance', instanceId);
}
// Send position with the instance information
export function sendPlayerPosition(id, x, y) {
  socket.emit('player-update', {
    id: id,
    x: x,
    y: y,
    instanceId: instanceId
  });
}

async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
  return 1;
}