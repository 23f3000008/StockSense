const nodemailer = require('nodemailer');

// 6-digit numeric OTP, e.g. "042917"
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendOtpEmail(toEmail, otp) {
  const minutes = process.env.OTP_EXPIRE_MINUTES || 10;
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'Your StockSense password reset code',
    text: `Your one-time code is ${otp}. It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your one-time code is <strong style="font-size:18px;letter-spacing:2px;">${otp}</strong>.</p>
           <p>It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

module.exports = { generateOtp, sendOtpEmail };
