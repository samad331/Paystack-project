
console.log('script started');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

async function sendRegistrationEmail({ to, username, verificationLink }) {
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject: 'Welcome to Our Service',
        text: `Hello ${username},\n\nThank you for registering. Please verify your email by clicking the link below:\n${verificationLink}\n\nBest regards,\nYour Service Team`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}
