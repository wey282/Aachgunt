import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { Server } from "socket.io";
import { createServer } from 'http';
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

// import { initSocketIOserver } from "./socketIOserver"


dotenv.config({ path: "../.env" });
const app = express();
const port = process.env.PORT || 3001;
const server = createServer(app);

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = dirname(__filename); // get the name of the directory

const staticPath = resolve(__dirname, "dist");
console.log(`staticPath: ${staticPath}`);

app.use(express.static(staticPath));
// const server = createServer((req, res) => {
//   res.writeHead((200, { 'Content-Type': 'text/plain' }));
//   res.end('Helo, GFG!');
// });
// const io = new Server(server, {
//   cors: {
//     origin: ['http://localhost:5173']
//   }
// });
const io = new Server(server, { 
  cors: { origin: '*', methods: ["GET", "POST"], credentials: true},
  allowEIO3: true 
});

// Allow express to parse JSON bodies
app.use(express.json());

app.post("/api/token", async (req, res) => {
  
  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  });

  // Retrieve the access_token from the response
  const { access_token } = await response.json();

  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
});

const players = {};

io.on('connection', (socket) => {

  // console.log(`Player connected: ${socket.id}`);
  console.log(`Player connected`);


  // Listen for player movement
  socket.on('player-update', (data) => {
    players[socket.id] = { x: data.x, y: data.y, id: data.id };

    // Send updated positions to all other clients
    // io.to(data.instanceId).emit('update-players', players[socket.id]);
    io.emit('player-update', data);
    io.emit('update-players', players[socket.id]);
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    io.emit('player-left', players[socket.id].id);
    delete players[socket.id];
  });

  socket.on('join-instance', (instanceId) => {
    socket.join(instanceId);
    io.emit('on-join-instance', instanceId);
  });
});

io.on('connect', (socket) => {

  console.log(`Player connected: ${socket.id}`);

  // Listen for player movement
  socket.on('player-update', (data) => {
    players[socket.id] = { x: data.x, y: data.y, id: data.id };

    // Send updated positions to all other clients
    // io.to(data.instanceId).emit('update-players', players[socket.id]);
    io.emit('player-update', data);
    io.emit('update-players', players[socket.id]);
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    io.emit('player-left', players[socket.id].id);
    delete players[socket.id];
  });

  socket.on('join-instance', (instanceId) => {
    socket.join(instanceId);
    io.emit('on-join-instance', instanceId);
  });
});

io.engine.on("connection_error", (err) => {
  console.log(err.req);      // the request object
  console.log(err.code);     // the error code, for example 1
  console.log(err.message);  // the error message, for example "Session ID unknown"
  console.log(err.context);  // some additional error context
});

// initSocketIOserver();

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    const index = join(__dirname, "dist", "index.html");
    return res.sendFile(index);
  });
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening at http://localhost:${port}`);
});