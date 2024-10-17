import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import logger from 'winston';
import morgan from 'morgan';
import { configDotenv } from 'dotenv';
configDotenv();

import Dbo from './db/dbo.js';
const dbo = new Dbo();
import BattleHelper from './helpers/battleHelper.js';
import DataProcessingHelper from './helpers/dataProcessingHelper.js';
const battleHelper = new BattleHelper();
const dataProcessingHelper = new DataProcessingHelper();

let app = express();
const corsOptions = {
  origin: 'https://rosterdle.com',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.server = http.createServer(app);

// Configure the logger
logger.configure({
  level: 'info',
  handleExceptions: true,
  json: true,
  colorize: true,
  transports: [new logger.transports.Console()],
});
app.use(morgan('dev'));

// Configure the socket server
const io = new Server(app.server, {
  cors: {
    origin: process.env.CORS_APP_ORIGIN,
  },
});
let users = [];
let lobby = [];
io.on('connection', socket => {
  // New user connects
  logger.info(`⚡: ${socket.id} user just connected!`);
  users.push({
    id: socket.id,
  });
  io.to(socket.id).emit('connectionSuccessful');

  // Get user
  socket.on('getUser', userInfo => {
    dbo
      .getUser(userInfo)
      .then(user => {
        io.to(socket.id).emit('userData', dataProcessingHelper.processUser(user));
      })
      .catch(err => {
        logger.info(`Something went wrong loading user: ${err}`);
      });
  });

  // Update user preferences
  socket.on('updateUserPreferences', userPreferences => {
    dbo
      .setUserPreferences(userPreferences)
      .then(result => {
        const x = result;
      })
      .catch(err => {
        logger.info(`Something went wrong updating user preferences: ${err}`);
      });
  });

  socket.on('getDailyGameTargets', () => {
    dbo
      .getDailyGameTargets()
      .then(targets => {
        io.to(socket.id).emit('dailyGameTargets', dataProcessingHelper.processDailyGameTargets(targets));
      })
      .catch(err => {
        logger.info(`Something went wrong loading daily game targets: ${err}`);
      });
  });

  socket.on('getUserDailyGames', userId => {
    dbo
      .getUserDailyGames(userId)
      .then(userDailyGames => {
        io.to(socket.id).emit('userDailyGames', dataProcessingHelper.processUserDailyGames(userDailyGames));
      })
      .catch(err => {
        logger.info(`Something went wrong loading user daily games: ${err}`);
      });
  });

  socket.on('guessSubmitted', guess => {
    if (guess.userId) dbo.handleDailyGameGuess(guess.userId, guess.player, guess.today);
  });

  socket.on('dailyGameOver', gameInfo => {
    if (gameInfo.userId) dbo.handleDailyGameOver(gameInfo);
  });

  // User enters lobby.  Attempts to find a game for them
  socket.on('enterLobby', username => {
    logger.info(`${username} joined the lobby!`);
    let user = users.find(user => user.id == socket.id);
    user.username = username;
    lobby.push(user);
    if (lobby.length >= 2) {
      // Get two users from lobby
      [first, second, lobby] = battleHelper.matchUsersInLobby(lobby);

      // Create game room and enter sockets
      const gameId = battleHelper.generateGameId();
      const firstSocket = io.sockets.sockets.get(first.id);
      const secondSocket = io.sockets.sockets.get(second.id);
      firstSocket.join(gameId);
      secondSocket.join(gameId);
      users.find(user => user.id == first.id).gameId = gameId;
      users.find(user => user.id == second.id).gameId = gameId;

      // Emit foundGame to the users
      const firstGoesFirst = Math.random() < 0.5;
      io.to(first.id).emit('foundGame', { gameId, opponent: second.username, yourMove: firstGoesFirst });
      io.to(second.id).emit('foundGame', { gameId, opponent: first.username, yourMove: !firstGoesFirst });
    }
  });

  // User leaves lobby (manually)
  socket.on('leaveLobby', () => {
    logger.info(`${socket.id} left the lobby!`);
    lobby = lobby.filter(user => user.id != socket.id);
  });

  // User submits a player
  socket.on('submitPlayer', data => {
    const gameRoom = io.sockets.adapter.rooms.get(data.gameId);
    gameRoom.forEach(socketId => {
      io.to(socketId).emit('playerSubmitted', {
        player: data.player,
        submittedBy: users.find(user => user.id == socket.id).name,
        yourMove: socketId != socket.id,
      });
    });
  });

  // User's timer expires
  socket.on('timerExpired', data => {
    logger.info(`Timer expired for ${socket.id}`);
    const gameRoom = io.sockets.adapter.rooms.get(data.gameId);
    gameRoom.forEach(socketId => {
      if (socketId != socket.id) {
        // emit won game event to the other user
        io.to(socketId).emit('gameOver', { gameWon: true, message: 'OPPONENT RAN OUT OF TIME' });
        // socket leave room
        const winnerSocket = io.sockets.sockets.get(socketId);
        winnerSocket.leave(data.gameId);
      }
    });
    // emit lost game event to user
    io.to(socket.id).emit('gameOver', { gameWon: false, message: 'YOU RAN OUT OF TIME' });
    // socket leave room
    socket.leave(data.gameId);
  });

  // User disconnects
  socket.on('disconnect', () => {
    logger.info(`🔥: A user disconnected - ${socket.id}`);

    // If disconnecting user was in a game, give win to the other user
    const gameId = users.find(user => user.id == socket.id).gameId;
    try {
      const gameRoom = io.sockets.adapter.rooms.get(gameId);
      const otherUserId = gameRoom.values().next().value;
      socket.to(otherUserId).emit('gameOver', { gameWon: true, message: 'OPPONENT DISCONNECTED' });
    } catch {
      logger.info(`Could not award win on user disconnection`);
    }
    users = users.filter(user => user.id !== socket.id);
    lobby = lobby.filter(user => user.id !== socket.id);
    io.emit('newUserResponse', users);
    socket.disconnect();
  });
});

// Define API routes
app.get('/', (req, res) => {
  res.sendfile('static/root.html');
});

// Set up listen arguments and listen
const listenArguments = [];
listenArguments.push(process.env.PORT || 4000);
const listenCallback = () => {
  logger.info(`Rosterdle API started on port ${app.server.address().port}`);
};
listenArguments.push(listenCallback);
app.server.listen(...listenArguments);
