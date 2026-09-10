import { Resend } from "resend";

const sendEmail = async ({ to, subject, text }) => {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "-",
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    // Deliberately not re-thrown — an email failure shouldn't block
    // the approval/rejection action itself from succeeding.
  }
};

export default sendEmail;