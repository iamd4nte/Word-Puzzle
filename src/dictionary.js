import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Promisify readFile and readdir functions for async usage
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

/**
 * Class representing a dictionary of words.
 */
class Dictionary {
    /**
     * Create a dictionary.
     * @param {string[]} words - Array of words.
     */
    constructor(words) {
        this.wordLength = undefined;
        this.wordsList = [];
        
        // Validate and initialize word list
        for (const word of words) {
            if (this.wordLength === undefined) {
                this.wordLength = word.length;
            } else if (this.wordLength !== word.length) {
                throw new Error("Inconsistent word lengths");
            }
            this.wordsList.push(word.toUpperCase());
        }
        
        this.wordsSet = new Set(this.wordsList);
    }

    /**
     * Check if a word exists in the dictionary.
     * @param {string} word - Word to check.
     * @returns {boolean} True if the word exists, false otherwise.
     */
    hasWord(word) {
        return this.wordsSet.has(word.toUpperCase());
    }

    /**
     * Select a random word from the dictionary.
     * @returns {string} A random word.
     */
    selectRandomWord() {
        const randomIndex = Math.floor(Math.random() * this.wordsList.length);
        return this.wordsList[randomIndex];
    }

    /**
     * Get the length of words in the dictionary.
     * @returns {number} The word length.
     */
    getWordLength() {
        return this.wordLength;
    }
}

// Directory containing dictionary files
const DICTIONARY_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "../dict/");

/**
 * Create a dictionary from a dictionary file.
 * @param {string} dictFileName - The dictionary file name.
 * @returns {Promise<Dictionary>} A promise that resolves to a Dictionary instance.
 */
Dictionary.create = async (dictFileName) => {
    const contents = await readFileAsync(path.join(DICTIONARY_DIR, dictFileName), "utf8");
    const words = contents.split("\n").filter(word => word.length > 0);
    return new Dictionary(words);
};

/**
 * Get all available dictionaries from dictionary files.
 * @returns {Promise<Map<string, Dictionary>>} A promise that resolves to a map of file names to Dictionary instances.
 */
Dictionary.getAllAvailableDictionaries = async () => {
    const files = await readdirAsync(DICTIONARY_DIR);
    const dictionaries = new Map();

    for (const file of files) {
        const dictionary = await Dictionary.create(file);
        dictionaries.set(file, dictionary);
    }

    return dictionaries;
};

export { Dictionary };
