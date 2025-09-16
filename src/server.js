
require('dotenv').config();
const express = require('express');
const path = require('path');
const ports = 3000;
const db = require('./config/sql');
const jwt = require('jsonwebtoken');
const AuthController = require('./controllers/AuthController');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    verificationToken TEXT,
    isVerified BOOLEAN DEFAULT 0,
    newPassword TEXT,
    verificationTokenExpires TIMESTAMP,
    resetToken TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    walletBalance REAL DEFAULT 0,
    amount REAL DEFAULT 0
)`);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.post('/api/login', AuthController.login);

app.post('/api/register', AuthController.register);

app.get('/api/verify', AuthController.verifyEmail);


app.get('/api/register', (req, res) => {
    res.status(200).json({ message: 'Registration endpoint is working' });
});

app.post('/api/resetpassword', AuthController.sendPasswordResetEmail);
app.get('/api/resetpassword/verify', AuthController.resetPassword);

app.post('/api/fundwallet',Transactions.fundwallet);



app.listen(ports, () => {
  console.log(`Server is running on port ${ports}`);
});
