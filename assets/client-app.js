// Function to parse query string parameters from the URL
const parseQueryString = () => {
    const queryString = window.location.search;
    const query = {};
    const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
};

// Retrieve query string parameters once on page load
const queryStringParams = parseQueryString();

// Function to check if dark mode is preferred based on cookies
const isDarkModePreferred = () => {
    for (const cookie of document.cookie.split("; ")) {
        const [name, value] = cookie.split("=");
        if (name === "darkMode" && value === "true") {
            return true;
        }
    }
    return false;
};

// Vue application instance
const app = new Vue({
    el: "#app", // Element to mount Vue instance

    // Data properties for the application state
    data: {
        allowedLetters: new Set("QWERTYUIOPASDFGHJKLZXCVBNM"), // Set of allowed letters for the game
        keyboard: [ // Keyboard layout for the game
            [..."QWERTYUIOP"],
            [..."ASDFGHJKL"],
            ["ENTER", ..."ZXCVBNM", "⌫ "],
        ],

        gameState: undefined, // Current game state
        error: undefined, // Error message display
        darkMode: false // Dark mode flag
    },

    // Methods to handle various actions and interactions
    methods: {

        // Method to start a new game
        startGame: async function() {
            try {
                // Fetch game data from the server
                const response = await fetch("/game/start", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        dictName: queryStringParams.dictName // Send dictionary name from query params
                    })
                });

                // Parse response data
                const newGameData = await response.json();
                const { id, totalAttempts, wordLength } = newGameData;

                // Initialize game state
                this.gameState = {
                    id,
                    totalAttempts,
                    wordLength,
                    currentAttempt: 0,
                    board: [],
                    wrongKeys: new Set(),
                    rightKeys: new Set(),
                    finished: false,
                    won: false,
                    revealedWord: undefined
                };

                // Initialize game board with rows and tiles
                for (let i = 0; i < totalAttempts; i++) {
                    const row = [];
                    this.gameState.board.push(row);
                    for (let j = 0; j < wordLength; j++) {
                        row.push({
                            letter: undefined,
                            result: undefined
                        });
                    }
                }
            } catch (error) {
                console.error('Error starting game:', error);
                this.error = 'Failed to start the game. Please try again.';
            }
        },

        // Method to handle new letter input from the keyboard
        handleNewLetter: async function(key) {
            if (key === "ENTER" && this.gameState.finished) {
                this.startGame(); // Restart game on ENTER if finished
            }

            if (!this.gameState || this.gameState.finished) {
                return; // Ignore input if game not started or already finished
            }

            if (key === "ENTER") {
                await this.submitWord(); // Submit word on ENTER key press
            } else if (key === "⌫ " || key === "BACKSPACE") {
                this.deleteLetter(); // Delete last entered letter on BACKSPACE
            } else {
                this.addLetter(key); // Add new letter to the current attempt
            }
        },

        // Method to add a letter to the current attempt
        addLetter: function(letter) {
            letter = (letter || "").toUpperCase();
            if (!this.allowedLetters.has(letter)) {
                return; // Ignore non-allowed letters
            }

            const { board, currentAttempt } = this.gameState;
            const row = board[currentAttempt];
            for (const tile of row) {
                if (tile.letter === undefined) {
                    tile.letter = letter;
                    break;
                }
            }
        },

        // Method to delete the last entered letter
        deleteLetter: function() {
            const { board, currentAttempt } = this.gameState;
            const row = board[currentAttempt];
            let lastTile;
            for (const tile of row) {
                if (tile.letter !== undefined) {
                    lastTile = tile;
                } else {
                    break;
                }
            }
            if (lastTile) {
                lastTile.letter = undefined;
            }
        },

        // Method to submit the current word attempt
        submitWord: async function() {
            const { id, board, currentAttempt } = this.gameState;
            const row = board[currentAttempt];
            let guess = "";
            for (const tile of row) {
                if (tile.letter) {
                    guess += tile.letter;
                } else {
                    return; // Do not submit if any tile is empty
                }
            }

            try {
                // Send guess to server for validation
                const response = await fetch("/game/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: this.gameState.id,
                        guess,
                    })
                });

                // Parse response data
                const data = await response.json();

                // Handle error response
                if (data.error) {
                    console.warn('Submit word error:', data.error);
                    this.error = data.error;
                    window.setTimeout(() => {
                        this.error = undefined;
                    }, 1000); // Clear error message after 1 second
                    return;
                }

                // Update board with results of the guess
                const { result } = data;
                if (result) {
                    for (let i = 0; i < row.length; i++) {
                        const tile = row[i];
                        const tileResult = result[i];
                        if (tileResult === "2") {
                            tile.result = "correct";
                            this.gameState.rightKeys.add(tile.letter);
                        } else if (tileResult === "1") {
                            tile.result = "present";
                            this.gameState.rightKeys.add(tile.letter);
                        } else {
                            this.gameState.wrongKeys.add(tile.letter);
                        }
                    }
                }

                // Handle game outcome
                if (data.won) {
                    this.gameState.finished = true;
                    this.gameState.won = true;
                    return; // Game won, stop further processing
                }

                if (data.finished) {
                    this.gameState.revealedWord = data.word;
                    this.gameState.finished = true;
                    return; // Game finished, stop further processing
                }

                // Move to the next attempt
                this.gameState.currentAttempt++;

                // Ensure the current row is visible on the board
                const rowDom = document.getElementById(`board-row-${this.gameState.currentAttempt}`);
                if (rowDom) {
                    if (rowDom.scrollIntoViewIfNeeded) {
                        rowDom.scrollIntoViewIfNeeded();
                    } else {
                        rowDom.scrollIntoView();
                    }
                }
            } catch (error) {
                console.error('Submit word error:', error);
                this.error = 'Failed to submit the word. Please try again.';
            }
        },

        // Method to dynamically assign CSS classes for keyboard keys
        classForKey: function(key) {
            return {
                btn: true,
                key: true,
                right: this.gameState && this.gameState.rightKeys.has(key),
                wrong: this.gameState && this.gameState.wrongKeys.has(key),
            };
        },

        // Method to toggle dark mode
        toggleDarkMode: function() {
            this.darkMode = !this.darkMode;
            const body = document.querySelector("body");
            if (this.darkMode) {
                body.classList.add("dark"); // Apply dark mode styles
            } else {
                body.classList.remove("dark"); // Remove dark mode styles
            }
            document.cookie = `darkMode=${this.darkMode}`; // Set dark mode preference in cookies
        }

    },

    // Lifecycle hook: executed after the instance has been mounted
    mounted: function() {
        this.startGame(); // Start a new game when Vue instance is mounted

        // Event listener for keyboard input
        document.addEventListener("keyup", async (e) => {
            if (e.ctrlKey || e.altKey || e.metaKey) {
                return; // Ignore key presses with modifier keys
            }
            await this.handleNewLetter(e.key.toUpperCase()); // Handle new letter input
        });

        // Check if dark mode is preferred and toggle if necessary
        if (isDarkModePreferred()) {
            this.toggleDarkMode();
        }
    },
});
