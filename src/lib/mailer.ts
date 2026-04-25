import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("Missing EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: "Recuperar contraseña — El Bravo",
    text: [
      "Recibimos una solicitud para restablecer la contraseña de tu cuenta en El Bravo.",
      "",
      `Entrá a este link para elegir una nueva contraseña (expira en 30 minutos):`,
      resetUrl,
      "",
      "Si no solicitaste esto, ignorá este mail.",
    ].join("\n"),
    html: `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0f172a;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#1e293b;border-radius:16px;padding:32px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">El Bravo</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f1f5f9;">Recuperar contraseña</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
                Hacé clic en el botón para elegir una nueva.
              </p>
              <a href="${resetUrl}"
                style="display:inline-block;background:linear-gradient(to bottom,#65a30d,#3f6212);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:15px;font-weight:600;">
                Restablecer contraseña
              </a>
              <p style="margin:24px 0 4px;font-size:12px;color:#64748b;">
                Este link expira en <strong style="color:#94a3b8;">30 minutos</strong>.
                Si no solicitaste esto, podés ignorar este mail.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#475569;word-break:break-all;">
                O copiá: ${resetUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
