module.exports = io => {
    // Track games with player names
    const games = {};

    io.on('connection', socket => {
        console.log('New socket connection');

        let currentCode = null;
        let playerType = null; // Store player type (white/black/viewer)

        // Handle setting player names (from admin panel)
        socket.on('createMatch', function(data) {
            const { code, whitePlayerName, blackPlayerName } = data;
            // Store the game with player names
            games[code] = {
                hasWhite: false,
                hasBlack: false,
                players: [],
                whitePlayerName: whitePlayerName || 'White Player',
                blackPlayerName: blackPlayerName || 'Black Player'
            };
            console.log(`Game created with code: ${code}, White: ${whitePlayerName}, Black: ${blackPlayerName}`);
        });
        
        // Handle requests for player names
        socket.on('getPlayerNames', function(data) {
            const { gameId } = data;
            console.log(`Player names requested for game: ${gameId}`);
            if (games[gameId]) {
                console.log(`Sending player names: White: ${games[gameId].whitePlayerName}, Black: ${games[gameId].blackPlayerName}`);
                socket.emit('playerNames', {
                    white: games[gameId].whitePlayerName,
                    black: games[gameId].blackPlayerName
                });
            } else {
                console.log(`Game ${gameId} not found for player names request`);
            }
        });

        socket.on('move', function(move) {
            console.log('move detected')
            io.to(currentCode).emit('newMove', move);
        });
        
        socket.on('joinGame', function(data) {
            console.log(`Join game request received: Player: ${data.color}, Code: ${data.code}`);
            const code = data.code ? data.code.trim() : null;
            if (!code) {
                console.error("Rejecting join game request - no code provided");
                socket.emit('invalidCode');
                return;
            }
            currentCode = code;
            playerType = data.color;

            // Add player to the game
            socket.join(currentCode);
            if (!games[currentCode]) {
                games[currentCode] = {
                    hasWhite: playerType === 'white',
                    hasBlack: playerType === 'black',
                    players: [{ id: socket.id, type: playerType }],
                    whitePlayerName: 'White Player',
                    blackPlayerName: 'Black Player'
                };
            } else {
                if (playerType === 'white') {
                    games[currentCode].hasWhite = true;
                } else if (playerType === 'black') {
                    games[currentCode].hasBlack = true;
                }
                let playerExists = games[currentCode].players.some(p => p.id === socket.id);
                if (!playerExists) {
                    games[currentCode].players.push({ id: socket.id, type: playerType });
                }
            }
            // Send player names
            socket.emit('playerNames', {
                white: games[currentCode].whitePlayerName,
                black: games[currentCode].blackPlayerName
            });
            // Start game if both white and black are present
            if (games[currentCode].hasWhite && games[currentCode].hasBlack) {
                io.to(currentCode).emit('startGame');
            }
        });

        socket.on('disconnect', function() {
            console.log(`Socket disconnected: ${playerType}`);
            if (currentCode && games[currentCode]) {
                // Find and remove player from the game
                let playerIndex = -1;
                for (let i = 0; i < games[currentCode].players.length; i++) {
                    if (games[currentCode].players[i].id === socket.id) {
                        playerIndex = i;
                        break;
                    }
                }
                if (playerIndex >= 0) {
                    const player = games[currentCode].players[playerIndex];
                    games[currentCode].players.splice(playerIndex, 1);
                    if (player.type === 'white') {
                        games[currentCode].hasWhite = false;
                    } else if (player.type === 'black') {
                        games[currentCode].hasBlack = false;
                    }
                    if (player.type === 'white' || player.type === 'black') {
                        io.to(currentCode).emit('gameOverDisconnect');
                    }
                }
                if (games[currentCode].players.length === 0) {
                    delete games[currentCode];
                }
            }
        });
    });
};