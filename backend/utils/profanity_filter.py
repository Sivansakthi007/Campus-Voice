"""
Multilingual Profanity Filter Module

Detects foul/bad/unwanted language in text for complaint submission.
Supports English, Tamil, Hinglish, transliterations, and masked words.

Usage:
    from utils.profanity_filter import contains_profanity
    if contains_profanity(text):
        # Block the message
"""

import re
import unicodedata
from typing import Set


# Character substitution map for normalization
CHAR_SUBSTITUTIONS = {
    '@': 'a',
    '4': 'a',
    '8': 'b',
    '(': 'c',
    '<': 'c',
    '3': 'e',
    '6': 'g',
    '#': 'h',
    '!': 'i',
    '1': 'i',
    '|': 'i',
    '0': 'o',
    '$': 's',
    '5': 's',
    '+': 't',
    '7': 't',
    'v': 'u',
    '%': 'x',
    '2': 'z',
}

# Common English profanity words
ENGLISH_PROFANITY: Set[str] = {
    # Strong profanity
    'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks',
    'shit', 'shitty', 'bullshit', 'shitting',
    'bitch', 'bitches', 'bitchy',
    'ass', 'asshole', 'assholes', 'asses',
    'bastard', 'bastards',
    'damn', 'damned', 'dammit', 'goddamn',
    'crap', 'crappy',
    'dick', 'dicks', 'dickhead',
    'cock', 'cocks',
    'cunt', 'cunts',
    'piss', 'pissed', 'pissing',
    'whore', 'whores',
    'slut', 'sluts',
    'moron', 'idiot', 'idiots', 'stupid',
    'retard', 'retarded',
    
    # Slurs and offensive terms
    'nigger', 'nigga', 'negro',
    'faggot', 'fag', 'fags',
    
    # Additional common terms
    'wtf', 'stfu', 'lmao', 'lmfao',
    'jerk', 'jerks',
    'douche', 'douchebag',
    'screw', 'screwed',
    'suck', 'sucks', 'sucker',
    'bloody', 'hell',
}

# Tamil profanity (transliterated and native script)
TAMIL_PROFANITY: Set[str] = {
    # Common Tamil bad words (transliterated)
    'thevdiya', 'thevidiya', 'thevudiya',
    'punda', 'pundai', 'pundek',
    'soothu', 'soothla', 'sootha',
    'oombu', 'oombuda', 'otha',
    'baadu', 'badu', 'baadava',
    'koothi', 'koodi', 'koodhi',
    'mayiru', 'mayir', 'mairu',
    'sunni', 'sunniya', 'sunna',
    'thanga', 'thayoli', 'thaaiyoli',
    'naaye', 'naai', 'naayi', 'naay',
    'pichai', 'pichaikkaaran',
    'kena', 'kenna', 'kenai',
    'poolu', 'poolae', 'poola',
    'alukku', 'aluku',
    
    # Tamil script versions (common ones)
    'தேவடியா', 'புண்டை', 'சூத்து', 'ஊம்பு',
    'மயிர்', 'சுன்னி', 'தாயோளி', 'நாய்',
}

# Hinglish and Hindi profanity (transliterated)
HINGLISH_PROFANITY: Set[str] = {
    # Common Hindi/Hinglish bad words
    'chutiya', 'chutiye', 'chutia', 'chu',
    'madarchod', 'madarc', 'mc', 'maderchod',
    'behenchod', 'bc', 'behen', 'bhenchod',
    'bhosdike', 'bhosdi', 'bhosdiwala',
    'gaandu', 'gandu', 'gand',
    'lund', 'loda', 'lauda', 'lavda',
    'randi', 'raand', 'rand',
    'harami', 'haramzada', 'haramkhor',
    'kutta', 'kutte', 'kutiya', 'kutti',
    'saala', 'sala', 'saale', 'saali',
    'kamina', 'kamine', 'kamini',
    'ullu', 'bewakoof', 'gadha',
    'bakchod', 'bakchodi', 'bakwaas',
    'jhatu', 'jhant', 'jhaant',
    'tatti', 'tatti', 'potty',
    'suwar', 'suar', 'saanp',
    'bhikari', 'bikhaari',
    
    # Abbreviated forms commonly used
    'mkc', 'bkl', 'bsdk', 'gfy',
}

# Combined set for faster lookup
ALL_PROFANITY: Set[str] = ENGLISH_PROFANITY | TAMIL_PROFANITY | HINGLISH_PROFANITY


def normalize_text(text: str) -> str:
    """
    Normalize text for profanity detection.
    - Convert to lowercase
    - Replace character substitutions
    - Remove repeated characters
    - Normalize unicode
    """
    if not text:
        return ""
    
    # Normalize unicode (handle Tamil and other scripts)
    text = unicodedata.normalize('NFKC', text)
    
    # Convert to lowercase
    text = text.lower()
    
    # Replace character substitutions
    result = []
    for char in text:
        result.append(CHAR_SUBSTITUTIONS.get(char, char))
    text = ''.join(result)
    
    # Remove special characters between letters (f*ck -> fck)
    text = re.sub(r'(?<=[a-z])[*#@!$%^&_\-\.]+(?=[a-z])', '', text)
    
    # Reduce repeated characters (fuuuuck -> fuck)
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)
    
    return text


def extract_words(text: str) -> Set[str]:
    """Extract individual words from text."""
    if not text:
        return set()
    
    # Split on non-alphanumeric characters (keep Tamil unicode)
    words = re.split(r'[^\w\u0B80-\u0BFF]+', text, flags=re.UNICODE)
    return {w for w in words if w}


def contains_profanity(text: str) -> bool:
    """
    Check if text contains profanity or offensive language.
    
    Args:
        text: The text to check (can be title + description + voice_text)
        
    Returns:
        bool: True if profanity detected, False otherwise
    """
    if not text or not text.strip():
        return False
    
    # Normalize the text
    normalized = normalize_text(text)
    
    # Extract words
    words = extract_words(normalized)
    
    # Check each word against profanity list
    for word in words:
        # Direct match
        if word in ALL_PROFANITY:
            return True
        
        # Check without trailing/leading numbers (f4ck -> fack)
        cleaned = re.sub(r'^[0-9]+|[0-9]+$', '', word)
        if cleaned and cleaned in ALL_PROFANITY:
            return True
    
    # Also check the full normalized text for concatenated patterns
    # This catches things like "f.u.c.k" after normalization
    continuous_text = re.sub(r'[^a-z\u0B80-\u0BFF]', '', normalized)
    
    for bad_word in ALL_PROFANITY:
        if len(bad_word) >= 3 and bad_word in continuous_text:
            return True
    
    return False
