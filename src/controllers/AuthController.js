const db = require('../config/sql');
const jwt = require('jsonwebtoken');
const { sendRegistrationEmail } = require('../utils/email');
class AuthController {
    static async register(req, res) {

    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 7) {
        return res.status(400).json({ error: 'Password must be at least 7 characters long' });
    }
    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[@._-])[a-zA-Z0-9@._-]+$/.test(password)) {
        return res.status(400).json({
            error: 'Password must include at least one letter, one number, and one special character (@, ., -, _), and only use those characters'
        });
    }
    if (username.length < 6) {
        return res.status(400).json({ error: 'Username must be at least 6 characters long' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username should only contain alphanumeric characters and "_" ' });
    }
    if (!/^[^\s@]+@[^\s@]+\.com$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    const emailQuery = `SELECT email FROM users WHERE email = ? OR username = ?`;
    db.get(emailQuery, [email, username], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (row) {
            return res.status(400).json({ error: 'Email or username already exists' });
        }
    });

        const verificationToken = jwt.sign(
            { email, username },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1h' }
        );

    const insertQuery = `INSERT INTO users (username, email, password, verificationToken) VALUES (?, ?, ?, ?)`;
        db.run(insertQuery, [username, email, password, verificationToken], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            if (process.env.SEND_REGISTRATION_EMAIL === 'true') {
                const verificationLink = `http://localhost:3000/api/verify?token=${verificationToken}`;
                const subject = 'Email Verification';
                const body = `Hello ${username},\n\nThank you for registering. Please verify your email by clicking the link below:\n${verificationLink}\n\nBest regards,\nYour Service Team`;
                sendRegistrationEmail({ to: email, subject, body })
                    .catch(error => console.error('Error sending registration email:', error));
            }
            res.status(201).json({
                status: 'successful',
                message: 'User registered successfully',
                data: {
                    id: this.lastID,
                    username,
                    email
                }
            });
        });
    }

    static async login(req, res) {
      const { userid, password, } = req.body;
    if (!userid || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }    

    const query = `SELECT * FROM users WHERE username = ? AND password = ? OR email = ? AND password = ?`;
    db.get(query, [userid, password, userid, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (!row) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        if (!row.isVerified) {
            return res.status(403).json({ error: 'Email not verified' });
        }
        const token = jwt.sign(
            {
                id: row.id,
                username: row.username,
                email: row.email
            },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '1h' }
        );

        res.status(200).json({
            status: 'successful',
            message: 'Login successful',
            token,
            data: {
                id: row.id,
                username: row.username,
                email: row.email
            }
        });
    });
    }

    static async verifyEmail(req, res) {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const query = `SELECT * FROM users WHERE verificationToken = ?`;
        db.get(query, [token], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Invalid or expired verification token' });
            }
            if (row.isVerified) {
                return res.status(400).json({ error: 'Email already verified' });
            }

            const updateQuery = `UPDATE users SET isVerified = 1 WHERE id = ?`;
            db.run(updateQuery, [row.id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                res.status(200).json({
                    status: 'successful',
                    message: 'Email verified successfully',
                    data: {
                        id: row.id,
                        username: row.username,
                        email: row.email
                    }
                });
            });
        });
    }
    static async sendPasswordResetEmail(req, res) {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const query = `SELECT * FROM users WHERE email = ?`;
        db.get(query, [email], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'User not found' });
            }

            const resetToken = jwt.sign(
                { id: row.id, email: row.email },
                process.env.JWT_SECRET || 'default_secret',
                { expiresIn: '1h' }
            );
            const updateQuery = `UPDATE users SET resetToken = ? WHERE id = ?`;
            db.run(updateQuery, [resetToken, row.id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
            });

            const resetLink = `http://localhost:3000/api/resetpassword?token=${resetToken}`;
            const subject = 'Password Reset Request';
            const body = `Hello,\n\nYou requested a password reset. Please click the link below to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nYour Service Team`;
            console.log(body);
            sendRegistrationEmail({ to: email, subject, body })
                .catch(error => console.error('Error sending registration email:', error));

            res.status(200).json({
                status: 'successful',
                message: 'Password reset email sent',
                data: { resetToken }
            });
        });
    }
    static async resetPassword(req, res) {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const query = `SELECT * FROM users WHERE resetToken = ?`;
        db.get(query, [token], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Invalid or expired reset token' });
            }

            const updateQuery = `UPDATE users SET password = ?, resetToken = NULL WHERE id = ?`;
            db.run(updateQuery, [newPassword, row.id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }
                res.status(200).json({
                    status: 'successful',
                    message: 'Password reset successfully',
                    data: { id: row.id, username: row.username, email: row.email }
                });
            });
        });
    }
}
module.exports = AuthController;