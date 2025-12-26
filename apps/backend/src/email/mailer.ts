import nodemailer from 'nodemailer';
import { config } from '../config/env';

export const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: config.email.address,
    pass: config.email.password,
  },
});


export async function verifyMailer() {
  await mailer.verify();
  console.log('[email] SMTP ready');
}