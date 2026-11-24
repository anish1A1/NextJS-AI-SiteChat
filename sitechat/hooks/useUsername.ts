import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

// Creating a custom create and useUsername hook.

const ANIMALS = ["Hen", "Bear", "Guppy Fish", "Betta Fish", "Goldfish", "Cat", "Dog", "Parrot", "Cockatiel", "Hamster", "Rabbit", "Turtle", "Frog", "Lizard", "Snake", "Chameleon", "Iguana", "Gecko", "Tarantula", "Scorpion", "Crab", "Shrimp", "Snail", "Starfish", "Jellyfish", "Octopus", "Squid", "Dolphin", "Whale", "Seal", "Walrus"];
const STORAGE_KEY = 'sitechat_user'

const generateUsername = () => {
    const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    return `enigma:${word}:${nanoid(5)}`
    // Enigma: A person who is mysterious, puzzling, or hard to understand.
}

export function useUsername() {
    const [username, setUsername] = useState("");

    useEffect(() => {
        const main = () => {
            // Check if user is already in storage.
            const storage_key = localStorage.getItem(STORAGE_KEY)

            if (storage_key) {
                setUsername(storage_key)
                return;
            }

            // If there are no user than create.
            const generated = generateUsername()
            localStorage.setItem(STORAGE_KEY, generated);
            setUsername(generated)
        }
        main()
    },[])

    return {username}
}