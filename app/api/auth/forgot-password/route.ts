import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendPasswordResetEmail } from "@/src/lib/mailer";
import crypto from "crypto";

const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const normalizedEmail = String(body?.email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({
      ok: true,
      message: "Si el email está registrado, recibirás un link para restablecer tu contraseña.",
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Error procesando la solicitud" }, { status: 500 });
  }
}
