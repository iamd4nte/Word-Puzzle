/**
 * Computes the result of a guess against the correct word.
 * Each letter in the result is represented by:
 * - 0 if the letter is not present in the word.
 * - 1 if the letter is present in the word but in a different position.
 * - 2 if the letter is present in the word and in the correct position.
 *
 * @param {string} guess - The guessed word.
 * @param {string} correct - The correct word.
 * @returns {string} The result as a string of digits.
 */
const computeResult = (guess, correct) => {
    const result = [];
    const available = new Map();

    // Initialize result array and available letters map
    for (const letter of correct) {
        available[letter] = (available[letter] ?? 0) + 1;
        result.push(0);
    }

    // Check for correct letters in correct positions
    for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        if (letter === correct[i]) {
            result[i] = 2;
            available[letter]--;
        }
    }

    // Check for correct letters in incorrect positions
    for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        if (letter !== correct[i] && (available[letter] ?? 0) > 0) {
            available[letter]--;
            result[i] = 1;
        }
    }

    return result.join("");
};

/**
 * Class representing a game.
 */
class Game {
    /**
     * Create a game.
     * @param {Dictionary} dictionary - The dictionary to use.
     * @param {Object} options - The game options.
     * @param {number} options.totalAttempts - The total number of attempts allowed.
     * @param {string} [options.word] - The word to guess (optional).
     */
    constructor(dictionary, options = {}) {
        this.totalAttempts = options.totalAttempts || 5;
        this.dictionary = dictionary;

        // If a specific word is provided, ensure it exists in the dictionary
        if (options.word) {
            if (!dictionary.hasWord(options.word)) {
                throw new Error(`Word not in dictionary: '${options.word}'`);
            }
            this.word = options.word.toUpperCase();
        } else {
            this.word = dictionary.selectRandomWord().toUpperCase();
        }

        this.finished = false;
        this.won = false;
        this.currentGuess = 0;
    }

    /**
     * Start the game.
     * @returns {Object} The initial game state.
     */
    start() {
        return {
            totalAttempts: this.totalAttempts,
            wordLength: this.dictionary.getWordLength()
        };
    }

    /**
     * Submit a guess.
     * @param {string} guess - The guessed word.
     * @returns {Object} The result of the guess.
     */
    submitGuess(guess) {
        guess = guess.toUpperCase();

        // Check if the guessed word exists in the dictionary
        if (!this.dictionary.hasWord(guess)) {
            return { error: "Not in dictionary" };
        }

        // Check if the game is already finished
        if (this.finished) {
            throw new Error("Game finished");
        }

        this.currentGuess++;

        // Check if the guess is correct
        if (guess === this.word) {
            this.won = true;
            this.finished = true;
            return {
                finished: true,
                won: true,
                result: computeResult(guess, this.word)
            };
        }

        // Check if the maximum number of attempts has been reached
        if (this.currentGuess >= this.totalAttempts) {
            this.finished = true;
            return {
                result: computeResult(guess, this.word),
                finished: this.finished,
                word: this.word,
            };
        }

        // Return the result of the guess
        return {
            result: computeResult(guess, this.word),
            currentGuess: this.currentGuess,
        };
    }
}

export { Game };
