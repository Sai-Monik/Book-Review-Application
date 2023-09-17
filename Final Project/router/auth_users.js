const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const books = require('./booksdb.js');

const regd_users = express.Router();
const users = [];

const isValid = (username) => {
  // Register New user
  return !users.some((user) => user.username === username);
};

const authenticatedUser = (username, password) => {
  // Login as a Registered user
  const user = users.find((user) => user.username === username);
  if (user) {
    return bcrypt.compareSync(password, user.password);
  }
  return false;
};

// Register New user
regd_users.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Both username and password are required' });
  }
  if (!isValid(username)) {
    return res.status(400).json({ message: 'Username is already in use' });
  }

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }

    users.push({ username, password: hashedPassword });

    const secretKey = process.env.SECRET_KEY;
    const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });

    return res.status(200).json({ message: 'Registration successful', token });
  });
});

// Login as a Registered user
regd_users.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (authenticatedUser(username, password)) {
    const secretKey = process.env.SECRET_KEY;
    const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Login successful', token });
  } else {
    return res.status(401).json({ message: 'Authentication failed' });
  }
});

// Add/Modify a book review
regd_users.put('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  const { rating, comment } = req.body;

  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  if (!book.reviews) {
    book.reviews = {};
  }

  const username = req.user.username;

  book.reviews[username] = { rating, comment };
  return res.status(200).json({ message: 'Review added or modified successfully' });
});

// Delete book review added by that particular user
regd_users.delete('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  const username = req.user.username;

  if (book.reviews && book.reviews[username]) {
    delete book.reviews[username];
    return res.status(200).json({ message: 'Review deleted successfully' });
  } else {
    return res.status(404).json({ message: 'Review not found' });
  }
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
