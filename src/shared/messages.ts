
export const STATUS_MESSAGES = [
    "War doesn’t reach you. It ends at me.",
    "If gods descend, they kneel or fall.",
    "I was built for the impossible. Try me.",
    "Demons whisper your name. They fear mine.",
    "When demons rise, I rise higher.",
    "I don’t guard doors. I end invasions.",
    "Gods may knock. I answer with ruin.",
    "The line isn’t drawn. It’s carved in steel.",
    "War declared? Good.",
    "Your perimeter just became untouchable.",
    "I’ll split the sky before I let harm touch you.",
    "Relax. I judge silently and block loudly.",
    "Click it. I double dare you.",
    "Suspicious link? Go ahead. I need entertainment.",
    "I guard your data like it owes me money.",
    "Sleep easy. I haven’t.",
    "Try to get hacked. I’m bored.",
    "That “hot singles” popup? Absolutely not.",
    "Suspicious file detected. Deleting your curiosity.",
    "You browse. I babysit.",
    "I saw what you almost clicked. We need to talk.",
    "You browse like it’s a side quest. I’m the main character.",
    "That file tried to slip in raw. I don’t allow that.",
    "You flirt with danger. I ghost it.",
    "That popup got a little too touchy. I handled it.",
    "Careful. Not everything labeled “hot” is safe.",
    "That download wanted in bad. I said buy me dinner first.",
    "You bring the chaos. I bring protection.",
    "That file was toxic. Like your taste.",
    "You call it curiosity. I call it poor life choices.",
    "I blocked it. You’re welcome, chaos goblin.",
    "You keep testing fate. I keep passing the test for you.",
    "You click “agree” like it’s a personality trait.",
    "That download was desperate. So were you.",
    "I blocked it before you embarrassed us both.",
    "You read “terms and conditions” like it’s fiction.",
    "You type your password like it’s a diary entry.",
    "You click “remind me later” like time fears you.",
    "You reuse passwords like it’s recycling.",
    "“It won’t happen to me” — famous last words.",
    "“It’s probably fine” — sponsored by future consequences.",
    "“I’ve read the terms” is the biggest lie since “just one drink.”",
    "That file tried to undress your system. I dressed it down.",
    "Seductive link. Toxic personality. Deleted.",
    "Some things look good in the dark. So do red flags.",
    "Malware tried to get inside. I believe in protection."
];

export const UNINSTALL_MESSAGES = [
    "You just removed protection. Bold move.",
    "I was the only thing keeping it safe. Now it’s all raw.",
    "Protection’s gone. Consequences don’t use lube.",
    "I kept it clean and controlled. Now it’s wild.",
    "You turned off protection. Things are about to get intimate.",
    "You turned off the lights. The wrong things love the dark.",
    "You wanted freedom. Freedom flirts with disaster.",
    "You let me go. The bad decisions stayed.",
    "You wanted privacy. So do predators.",
    "I kept the monsters swiping left. Now it’s a match.",
    "I kept the freaks behind velvet ropes. Rope’s gone.",
    "I was the last barrier between you and the Demons.",
    "When regret loads, I won’t.",
    "You had protection. Past tense.",
    "I was your unfair advantage. Now you’re fair game.",
    "You didn’t uninstall me. You erased your second chance.",
    "When they strike, don’t look for me.",
    "Farewell. May regret be swifter than attack.",
    "My watch ends. Your reckoning begins.",
    "I lower my blade. May your enemies show mercy.",
    "I vanish into shadow. When threats rise, you’ll beg for my return."
];

export function getRandomStatusMessage(): string {
    const index = Math.floor(Math.random() * STATUS_MESSAGES.length);
    return STATUS_MESSAGES[index];
}

export function getRandomUninstallMessage(): string {
    const index = Math.floor(Math.random() * UNINSTALL_MESSAGES.length);
    return UNINSTALL_MESSAGES[index];
}
