const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
var path = require('path');
var static = path.join(__dirname, 'static');
const PORT = 4000;
const socketIO = require('socket.io')(http, {
  cors: {
    origin: 'http://localhost:3000',
  },
});
const Dbo = require('./db/dbo.js');
const dbo = new Dbo();
const battleHelper = require('./helpers/battleHelper');
const dataProcessingHelper = require('./helpers/dataProcessingHelper');

app.use(cors());
let users = [];
let lobby = [];

socketIO.on('connection', socket => {
  // New user connects
  console.log(`⚡: ${socket.id} user just connected!`);
  users.push({
    id: socket.id,
  });
  socketIO.to(socket.id).emit('connectionSuccessful');

  // Get user
  socket.on('getUser', userInfo => {
    dbo
      .getUser(userInfo)
      .then(user => {
        socketIO.to(socket.id).emit('userData', dataProcessingHelper.processUser(user));
      })
      .catch(err => {
        console.log(`Something went wrong loading user: ${err}`);
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
        console.log(`Something went wrong updating user preferences: ${err}`);
      });
  });

  socket.on('getDailyGameTargets', () => {
    dbo
      .getDailyGameTargets()
      .then(targets => {
        socketIO.to(socket.id).emit('dailyGameTargets', dataProcessingHelper.processDailyGameTargets(targets));
      })
      .catch(err => {
        console.log(`Something went wrong loading daily game targets: ${err}`);
      });
  });

  socket.on('getUserDailyGames', userId => {
    dbo
      .getUserDailyGames(userId)
      .then(userDailyGames => {
        socketIO.to(socket.id).emit('userDailyGames', dataProcessingHelper.processUserDailyGames(userDailyGames));
      })
      .catch(err => {
        console.log(`Something went wrong loading user daily games: ${err}`);
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
    console.log(`${username} joined the lobby!`);
    let user = users.find(user => user.id == socket.id);
    user.username = username;
    lobby.push(user);
    if (lobby.length >= 2) {
      // Get two users from lobby
      [first, second, lobby] = battleHelper.matchUsersInLobby(lobby);

      // Create game room and enter sockets
      const gameId = battleHelper.generateGameId();
      const firstSocket = socketIO.sockets.sockets.get(first.id);
      const secondSocket = socketIO.sockets.sockets.get(second.id);
      firstSocket.join(gameId);
      secondSocket.join(gameId);
      users.find(user => user.id == first.id).gameId = gameId;
      users.find(user => user.id == second.id).gameId = gameId;

      // Emit foundGame to the users
      const firstGoesFirst = Math.random() < 0.5;
      socketIO.to(first.id).emit('foundGame', { gameId, opponent: second.username, yourMove: firstGoesFirst });
      socketIO.to(second.id).emit('foundGame', { gameId, opponent: first.username, yourMove: !firstGoesFirst });
    }
  });

  // User leaves lobby (manually)
  socket.on('leaveLobby', () => {
    console.log(`${socket.id} left the lobby!`);
    lobby = lobby.filter(user => user.id != socket.id);
  });

  // User submits a player
  socket.on('submitPlayer', data => {
    const gameRoom = socketIO.sockets.adapter.rooms.get(data.gameId);
    gameRoom.forEach(socketId => {
      socketIO.to(socketId).emit('playerSubmitted', {
        player: data.player,
        submittedBy: users.find(user => user.id == socket.id).name,
        yourMove: socketId != socket.id,
      });
    });
  });

  // User's timer expires
  socket.on('timerExpired', data => {
    console.log(`Timer expired for ${socket.id}`);
    const gameRoom = socketIO.sockets.adapter.rooms.get(data.gameId);
    gameRoom.forEach(socketId => {
      if (socketId != socket.id) {
        // emit won game event to the other user
        socketIO.to(socketId).emit('gameOver', { gameWon: true, message: 'OPPONENT RAN OUT OF TIME' });
        // socket leave room
        const winnerSocket = socketIO.sockets.sockets.get(socketId);
        winnerSocket.leave(data.gameId);
      }
    });
    // emit lost game event to user
    socketIO.to(socket.id).emit('gameOver', { gameWon: false, message: 'YOU RAN OUT OF TIME' });
    // socket leave room
    socket.leave(data.gameId);
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log(`🔥: A user disconnected - ${socket.id}`);

    // If disconnecting user was in a game, give win to the other user
    const gameId = users.find(user => user.id == socket.id).gameId;
    try {
      const gameRoom = socketIO.sockets.adapter.rooms.get(gameId);
      const otherUserId = gameRoom.values().next().value;
      socket.to(otherUserId).emit('gameOver', { gameWon: true, message: 'OPPONENT DISCONNECTED' });
    } catch {
      console.log(`Could not award win on user disconnection`);
    }
    users = users.filter(user => user.id !== socket.id);
    lobby = lobby.filter(user => user.id !== socket.id);
    socketIO.emit('newUserResponse', users);
    socket.disconnect();
  });
});

// Return static page for root GET
app.get('/', (req, res) => {
  res.sendfile(path.join(static, 'root.html'));
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
