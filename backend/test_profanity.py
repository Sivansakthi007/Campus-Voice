"""Test script for profanity filter"""
from utils.profanity_filter import contains_profanity

# Test cases: (name, text, expected_result)
tests = [
    ("Clean text", "The WiFi is slow in my room", False),
    ("Clean academic", "Please resolve my hostel issue", False),
    ("Clean class word", "my class is cancelled today", False),
    ("English mild", "This damn thing is broken", True),
    ("English strong", "this is bullshit", True),
    ("Masked @", "what the f@ck", True),
    ("Masked !", "sh!t service", True),
    ("Masked $", "a$$hole staff", True),
    ("Tamil transliterated", "avan oru thevdiya", True),
    ("Tamil word naai", "avan naai mathiri irukkan", True),
    ("Hinglish chutiya", "sala chutiya hai", True),
    ("Hinglish bc", "behenchod problem", True),
    ("Mixed case", "FUCKING BROKEN", True),
    ("Spaced out", "f u c k", True),
    ("With numbers", "f4ck this", True),
]

print("=" * 60)
print("Profanity Filter Test Results")
print("=" * 60)

passed = 0
failed = 0

for name, text, expected in tests:
    result = contains_profanity(text)
    status = "PASS" if result == expected else "FAIL"
    if result == expected:
        passed += 1
    else:
        failed += 1
    print(f"{status}: {name}")
    if result != expected:
        print(f"       Text: '{text}'")
        print(f"       Expected: {expected}, Got: {result}")

print("=" * 60)
print(f"Results: {passed}/{len(tests)} passed, {failed} failed")
print("=" * 60)
