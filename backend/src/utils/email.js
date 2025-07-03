import nodemailer from "nodemailer";
import { ENV } from "../config/loadENV.js";
const transporter = nodemailer.createTransport({
  host: ENV.EMAIL.HOST,
  port: ENV.EMAIL.PORT,
  secure: false,
  auth: {
    user: ENV.EMAIL.USER,
    pass: ENV.EMAIL.PASSWORD,
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP Configuration Error:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
    });
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Check if email configuration exists
    if (!ENV.EMAIL.USER || !ENV.EMAIL.PASSWORD) {
      console.error("Missing email configuration:", {
        hasUser: !!ENV.EMAIL.USER,
        hasPassword: !!ENV.EMAIL.PASSWORD,
      });
      throw new Error(
        "Email configuration is missing. Please check your .env file"
      );
    }

    console.log("Attempting to send email to:", to);
    console.log("Email details:", {
      from: ENV.EMAIL.USER,
      to,
      subject,
      hasText: !!text,
      hasHtml: !!html,
    });

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: ENV.EMAIL.USER,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Detailed email error:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
      stack: error.stack,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
