PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    title_ru TEXT NOT NULL,
    title_kz TEXT NOT NULL,
    description_ru TEXT NOT NULL,
    description_kz TEXT NOT NULL,
    content_ru TEXT NOT NULL,
    content_kz TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_ru TEXT NOT NULL,
    question_kz TEXT NOT NULL,
    correct_option_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_options (
    question_id INTEGER NOT NULL,
    option_index INTEGER NOT NULL,
    text_ru TEXT NOT NULL,
    text_kz TEXT NOT NULL,
    PRIMARY KEY (question_id, option_index),
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
