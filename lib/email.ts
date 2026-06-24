import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST || 'smtp.zoho.in', // Use smtp.zoho.com if your account is global
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"OM Naturals" <${process.env.ZOHO_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
