package handlers

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

// ValidatePlayerName normalizes and validates a player-provided display name.
// It allows Japanese characters (hiragana/katakana/kanji) and lowercase latin,
// trims surrounding whitespace, collapses internal runs of whitespace to a single space,
// and enforces a length of 2..16 runes. Returns the normalized name and an error
// describing the first validation failure (if any).
func ValidatePlayerName(raw string) (string, error) {
	name := strings.TrimSpace(raw)
	// collapse internal whitespace runs
	fields := strings.Fields(name)
	name = strings.Join(fields, " ")

	runeCount := utf8.RuneCountInString(name)
	if name == "" || runeCount < 2 {
		return "", errNameTooShort
	}
	if runeCount > 16 {
		return "", errNameTooLong
	}

	for _, r := range name {
		if r == ' ' {
			continue
		}
		if !isAllowedNameRune(r) {
			return "", errNameInvalidChar
		}
	}

	return name, nil
}

// isAllowedNameRune permits letters (any script), marks, numbers (any script),
// and a small set of punctuation/symbols commonly used in handles.
// Control chars, newlines, and unusual symbols are rejected.
func isAllowedNameRune(r rune) bool {
	if unicode.IsControl(r) {
		return false
	}
	if unicode.IsLetter(r) || unicode.IsMark(r) || unicode.IsDigit(r) {
		return true
	}
	// Allow a curated set of safe punctuation/symbols
	switch r {
	case '-', '_', '.', '!', '?', '#', '@', '+', '~', '*', ':', '/', '(', ')':
		return true
	}
	// Allow general-category dash punctuation and connector punctuation
	if unicode.IsPunct(r) {
		return r == '-' || r == '_' || r == '.' || r == '!' || r == '?' || r == '#' || r == '@' || r == '+' || r == '~' || r == '*' || r == ':' || r == '/' || r == '(' || r == ')'
	}
	if unicode.IsSymbol(r) {
		// Allow modifier symbols and emoji-ish symbols, but skip control/format
		return true
	}
	return false
}

type nameValidationError struct{ msg string }

func (e *nameValidationError) Error() string { return e.msg }

var (
	errNameTooShort   = &nameValidationError{"name must be at least 2 characters"}
	errNameTooLong    = &nameValidationError{"name must be 16 characters or fewer"}
	errNameInvalidChar = &nameValidationError{"name contains characters that are not allowed"}
)