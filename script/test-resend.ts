import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log("API Key loaded:", process.env.RESEND_API_KEY ? "YES (" + process.env.RESEND_API_KEY.substring(0, 10) + "...)" : "NO");
  
  try {
    const { data, error } = await resend.emails.send({
      from: "King Vypers <onboarding@resend.dev>",
      to: "delivered@resend.dev", // Resend test email address
      subject: "Test Email dari King Vypers",
      html: "<p>Kode verifikasi Anda adalah: <strong>123456</strong></p>",
    });

    if (error) {
      console.error("Resend error:", error);
    } else {
      console.log("Email sent successfully!", data);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

main();
