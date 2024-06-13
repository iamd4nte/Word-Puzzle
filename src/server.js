import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { Game } from './game.js';
import { Dictionary } from './dictionary.js';

// Variables to store available dictionaries and the default dictionary
let dictionaries;
let defaultDictionary;

// Game configuration options
const gameOptions = {
    totalAttempts: Number(process.env.TOTAL_ATTEMPTS) || 5
};

// Map to store active games by their unique ID
const gamesById = new Map();

// Create an Express application
const app = express();

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static assets from the 'assets' directory
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), '../assets/')));

// Endpoint to start a new game
app.post('/game/start', (req, res) => {
    const { dictName } = req.body;
    const dictionary = dictionaries.get(dictName) || defaultDictionary;
    const game = new Game(dictionary, gameOptions);

    // Generate a unique ID for the game
    const id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);

    // Store the game in the map
    gamesById.set(id, game);

    // Respond with the game ID and initial game state
    res.json({
        id,
        ...game.start()
    });
});

// Endpoint to submit a guess for an active game
app.post('/game/submit', (req, res) => {
    const { id, guess } = req.body;
    const game = gamesById.get(String(id));

    // If the game ID is not found, return a 404 error
    if (!game) {
        return res.status(404).send('Game not found');
    }

    // Submit the guess and get the result
    const result = game.submitGuess(guess);

    // If the game is won, remove it from the map
    if (result.won) {
        gamesById.delete(id);
    }

    // Respond with the result of the guess
    res.json(result);
});

// Function to initialize the server
const startServer = async () => {
    try {
        // Load all available dictionaries
        dictionaries = await Dictionary.getAllAvailableDictionaries();
        defaultDictionary = dictionaries.get('en-us-5');

        console.log('Current dictionaries: ' + [...dictionaries.keys()]);

        // Get the port and address from environment variables or use defaults
        const port = process.env.PORT || 3333;
        const address = process.env.LISTEN_ADDRESS || '';

        // Start the server
        app.listen(port, address, () => {
            console.log(`Server is listening on port ${port}`);
        });
    } catch (err) {
        console.error('Failed to start the server:', err);
        process.exit(1);
    }
};

// Start the server
startServer();
