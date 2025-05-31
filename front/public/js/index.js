var playerColor = "";
var isViewer = false;
const path = window.location.pathname;
if (path === "/white") {
    playerColor = "white";
} else if (path === "/black") {
    playerColor = "black";
} else if (path === "/view") {
    playerColor = "viewer";
}

let gameHasStarted = false;
var board = null;
var game = new Chess();
var $status = $('#status');
var $pgn = $('#pgn');

let gameOver = false;

// Variables for click-to-move functionality
let moveFrom = null;
let moveTo = null;
let optionSquares = {};

// Function to highlight legal moves for a piece
function getMoveOptions(square) {
    console.log("Getting move options for square:", square);
    
    // Get all possible moves for the piece
    const moves = game.moves({
        square: square,
        verbose: true
    });
    
    if (moves.length === 0) {
        console.log("No legal moves for this piece");
        clearHighlights();
        return false;
    }
    
    console.log(`Found ${moves.length} legal moves for piece at ${square}`);
    
    // Clear previous highlights
    clearHighlights();
    
    // Add new highlights for source and destinations
    optionSquares = {};
    
    // Highlight the selected square
    optionSquares[square] = { className: 'from-square' };
    $(`.square-${square}`).addClass('from-square');
    
    // Highlight destination squares
    moves.forEach(move => {
        const targetSquare = move.to;
        const hasPiece = game.get(targetSquare);
        const isCapture = hasPiece && hasPiece.color !== game.get(square).color;
        
        if (isCapture) {
            // Capture move
            optionSquares[targetSquare] = { className: 'capture-square' };
            $(`.square-${targetSquare}`).addClass('capture-square');
        } else {
            // Regular move
            optionSquares[targetSquare] = { className: 'to-square' };
            $(`.square-${targetSquare}`).addClass('to-square');
        }
        
        console.log(`Highlighting move to ${targetSquare} (${isCapture ? 'capture' : 'regular'})`);
    });
    
    return true;
}

// Apply square styles to the board
function applySquareStyles() {
    // Clear all highlights first
    $('.square-55d63').css('background', '');
    
    // Apply new highlights
    Object.keys(optionSquares).forEach(square => {
        $(`.square-${square}`).css('background', optionSquares[square].background);
    });
}

// Clear all highlights
function clearHighlights() {
    $('.square-55d63').removeClass('from-square to-square capture-square');
    optionSquares = {};
}

// Handle square click - implements the logic from the React example
function onSquareClick(square) {
    console.log("[DEBUG] Square clicked:", square);
    console.log("[DEBUG] gameHasStarted:", gameHasStarted, "gameOver:", gameOver, "playerColor:", playerColor, "game_over():", game.game_over());
    
    // Don't allow moves if game over, not started, or viewer
    if (game.game_over() || !gameHasStarted || gameOver || playerColor === 'viewer') {
        console.log("Move not allowed - game over or not your turn");
        return;
    }
    
    // Only allow clicking pieces of your color on your turn
    const piece = game.get(square);
    const isPlayersTurn = (game.turn() === 'w' && playerColor === 'white') || 
                          (game.turn() === 'b' && playerColor === 'black');
    
    if (!isPlayersTurn) {
        console.log("Not your turn");
        return;
    }
    
    // From square (first click)
    if (!moveFrom) {
        // Check if square contains a piece that belongs to the player
        if (piece && ((playerColor === 'white' && piece.color === 'w') || 
                     (playerColor === 'black' && piece.color === 'b'))) {
            
            const hasMoveOptions = getMoveOptions(square);
            if (hasMoveOptions) {
                console.log("Selected piece at", square);
                moveFrom = square;
            }
        } else {
            console.log("No player piece at square:", square);
        }
        return;
    }
    
    console.log("Attempting to move from", moveFrom, "to", square);
    
    // To square (second click)
    // Check if valid move
    const moves = game.moves({
        square: moveFrom,
        verbose: true
    });
    
    console.log("Available moves:", moves);
    
    const foundMove = moves.find(m => m.from === moveFrom && m.to === square);
    
    // Not a valid move
    if (!foundMove) {
        // If clicked on another of player's pieces, get options for that piece
        if (piece && ((playerColor === 'white' && piece.color === 'w') || 
                     (playerColor === 'black' && piece.color === 'b'))) {
            
            console.log("Selecting different piece at", square);
            const hasMoveOptions = getMoveOptions(square);
            moveFrom = hasMoveOptions ? square : null;
        } else {
            // If clicked on empty square or opponent piece (not valid move)
            console.log("Invalid move target, clearing selection");
            moveFrom = null;
            clearHighlights();
        }
        return;
    }
    
    // Valid move found
    console.log("Making move from", moveFrom, "to", square);
    
    // Create move object
    const theMove = {
        from: moveFrom,
        to: square,
        promotion: foundMove.promotion || 'q' // Use the promotion from foundMove if available, else default to queen
    };
    
    // Make the move
    const move = game.move(theMove);
    
    if (move === null) {
        console.error("Move failed even though it was found in legal moves");
        moveFrom = null;
        clearHighlights();
        return;
    }
    
    // Send the move to other players
    socket.emit('move', theMove);
    
    // Update board position
    board.position(game.fen());
    
    // Reset the move variables
    moveFrom = null;
    clearHighlights();
    
    // Update game status
    updateStatus();
    
    // Show move visually by highlighting
    $(`.square-${theMove.from}`).addClass('highlight-from');
    $(`.square-${theMove.to}`).addClass('highlight-to');
    
    // Remove highlights after a short delay
    setTimeout(() => {
        $('.highlight-from, .highlight-to').removeClass('highlight-from highlight-to');
    }, 1000);
}

socket.on('newMove', function(move) {
    // Clear any move selection when receiving opponent's move
    moveFrom = "";
    clearHighlights();
    
    // Make the received move
    game.move(move);
    board.position(game.fen());
    updateStatus();
    
    // Update turn indicators
    if (typeof window.updateTurnIndicator === 'function') {
        window.updateTurnIndicator(game.turn());
    }
});

let whitePlayerName = 'White Player';
let blackPlayerName = 'Black Player';

function updatePlayerNames() {
    const whiteNameEl = document.getElementById('whitePlayerName');
    const blackNameEl = document.getElementById('blackPlayerName');

    if (whiteNameEl) whiteNameEl.textContent = whitePlayerName;
    if (blackNameEl) blackNameEl.textContent = blackPlayerName;
}

function updateStatus() {
    var status = '';

    var moveColor = 'White';
    var currentPlayerName = whitePlayerName;

    if (game.turn() === 'b') {
        moveColor = 'Black';
        currentPlayerName = blackPlayerName;
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + currentPlayerName + ' (' + moveColor + ') is in checkmate.';
    }
    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position';
    }
    else if (gameOver) {
        status = 'Opponent disconnected, you win!';
    }
    else if (!gameHasStarted) {
        status = 'Waiting for ' + blackPlayerName + ' to join';
    }
    // game still on
    else {
        status = currentPlayerName + ' (' + moveColor + ') to move';

        // check?
        if (game.in_check()) {
            status += ', ' + currentPlayerName + ' is in check';
        }
    }

    $status.html(status);
    $pgn.html(game.pgn());
    
    // Update turn indicator
    if (typeof window.updateTurnIndicator === 'function') {
        window.updateTurnIndicator(game.turn());
    }
}

// Initialize everything when document is ready
$(document).ready(function() {
    console.log("Document ready, initializing board");
    
    // Initialize the board with click-to-move (no drag)
    var config = {
        draggable: false,
        position: 'start',
        pieceTheme: '/public/img/chesspieces/wikipedia/{piece}.png',
        onSnapEnd: updateStatus
    };
    
    board = Chessboard('myBoard', config);
    
    // Flip the board for black player
    if (playerColor === 'black') {
        board.flip();
    }
    
    // Update initial status
    updateStatus();
    
    // Bind click handlers immediately after creating the board
    bindSquareClickHandlers();
    
    // Also bind click handlers again after a short delay to ensure everything is rendered
    setTimeout(function() {
        bindSquareClickHandlers();
        console.log("Click handlers attached to squares");
    }, 500);
    
    // Button to flip the board
    $('#flipBtn').on('click', function() {
        board.flip();
        // Rebind click handlers after flipping the board
        setTimeout(bindSquareClickHandlers, 100);
    });
    
    // Join game with code from URL
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('code')) {
        const code = urlParams.get('code');
        console.log(`Joining game with code: ${code} as ${playerColor}`);

        socket.emit('joinGame', {
            code: code,
            color: playerColor
        });
    }
    
    // Initialize the game
    initializeGame();
});

// Bind click handlers to all squares
function bindSquareClickHandlers() {
    // Make sure pieces don't block square clicks
    $('.piece-417db').css('pointer-events', 'none');
    
    // Add click handlers to all squares
    $('.square-55d63').each(function() {
        const $square = $(this);
        const squareName = $square.data('square');
        
        if (squareName) {
            $square.off('click').on('click', function(e) {
                e.stopPropagation();
                onSquareClick(squareName);
            });
        } else {
            // Fall back to class parsing if data-square is not available
            const classes = $square.attr('class').split(' ');
            let classSquareName = '';
            
            for (let i = 0; i < classes.length; i++) {
                if (classes[i].startsWith('square-')) {
                    classSquareName = classes[i].substring(7);
                    break;
                }
            }
            
            if (classSquareName) {
                $square.off('click').on('click', function(e) {
                    e.stopPropagation();
                    onSquareClick(classSquareName);
                });
            }
        }
    });
    
    // Ensure click-to-move works by adding this CSS to handle interaction
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .square-55d63 {
                cursor: pointer !important;
                position: relative !important;
                z-index: 1 !important;
            }
            
            .piece-417db {
                pointer-events: none !important;
                z-index: 2 !important;
            }
        `)
        .appendTo('head');
}

socket.on('connect', function() {
    console.log('Socket connected with id:', socket.id);
});

socket.on('connect_error', function(error) {
    console.error('Connection error:', error);
});

socket.on('invalidCode', function() {
    console.error('Invalid game code received from server');
    alert('Invalid game code. Please check the URL and try again.');
    window.location.href = '/?error=invalidCode';
});

socket.on('playerNames', function(data) {
    console.log('Received player names:', data);

    if (data.white) {
        whitePlayerName = data.white;
    }

    if (data.black) {
        blackPlayerName = data.black;
    }

    // Update the display with new names
    updatePlayerNames();

    // Also update the game status to reflect new names
    updateStatus();
});

function initializeGame() {
    // Request player names from server
    const gameId = window.gameId || new URLSearchParams(window.location.search).get('code');
    if (gameId) {
        socket.emit('getPlayerNames', { gameId: gameId });
    }

    // Initialize with default names in case server doesn't respond
    updatePlayerNames();
}

socket.on('gameState', function(data) {
    // Handle player names
    if (data.whitePlayerName) {
        whitePlayerName = data.whitePlayerName;
    }

    if (data.blackPlayerName) {
        blackPlayerName = data.blackPlayerName;
    }

    // Update the DOM elements
    updatePlayerNames();
});

socket.on('startGame', function() {
    console.log("[DEBUG] Received startGame event from server");
    gameHasStarted = true;
    console.log("[DEBUG] gameHasStarted set to", gameHasStarted);
    updateStatus();
    showNotification('Game has started!', 'success');
});

socket.on('gameOverDisconnect', function() {
    console.log("Game over - opponent disconnected");
    gameOver = true;
    updateStatus();
});

