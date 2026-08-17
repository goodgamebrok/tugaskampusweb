import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, HttpError } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { loginSchema, userRegisterSchema, userLoginSchema, createOrderSchema, validateKeySchema, generateKeysSchema, compensateSchema, scriptExecuteSchema, insertShowcaseSchema, insertPackageSchema, insertTeamSchema, insertTestimonialSchema, insertGameSupportSchema, botGenerateKeySchema, botRevokeKeySchema } from "@shared/schema";
import { z } from "zod";
import { casakuCheckStatus, casakuGenerateQrisV1 } from "./casaku";
import { Resend } from "resend";
import multer from "multer";
import { processAndUploadAvatar } from "./upload";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key");
const JWT_SECRET = process.env.SESSION_SECRET || "kingvypers-secret-key";
const USER_JWT_SECRET = process.env.USER_JWT_SECRET || JWT_SECRET;
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";

interface AuthRequest extends Request {
  adminId?: number;
}

interface UserAuthRequest extends Request {
  userId?: string;
}

function generateKeyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars[crypto.randomInt(chars.length)];
    }
    segments.push(segment);
  }
  return segments.join("-");
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number };
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const requireUserAuth = async (req: UserAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, USER_JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    if ((user as any).isBanned === 1) {
      return res.status(403).json({ message: "Akun dibanned", reason: (user as any).banReason ?? null });
    }
    if ((user as any).isEmailVerified === 0) {
      return res.status(403).json({ message: "Email belum diverifikasi", code: "UNVERIFIED_EMAIL" });
    }
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    const url = String(req.originalUrl || "");
    if (url.startsWith("/api/user/")) return 1000;
    return 100;
  },
  skip: (req) => String(req.originalUrl || "").startsWith("/api/webhooks/casaku"),
  message: { message: "Too many requests, please try again later" },
});

const keyValidationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many validation attempts, please wait" },
});

const scriptExecuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many script execute requests, please wait" },
});

const showcaseActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many actions, please try again later" },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api", apiLimiter);

  await ensureDefaultAdmin();

  // ─── Global Loader Script ────────────────────────────────────────────────
  // Public: any user can fetch the global loader script
  app.get("/api/loader-script", async (_req, res) => {
    try {
      const setting = await storage.getSetting("loader_script");
      return res.json({ loaderScript: setting?.value ?? null });
    } catch (error) {
      console.error("Get loader script error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin only: set the global loader script
  app.patch("/api/admin/loader-script", authMiddleware, async (req, res) => {
    try {
      const { loaderScript } = req.body as { loaderScript?: string | null };
      const setting = await storage.setSetting("loader_script", loaderScript ?? null);
      return res.json({ loaderScript: setting.value });
    } catch (error) {
      console.error("Set loader script error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Bot API ─────────────────────────────────────────────────────────────
  const botAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const botSecret = process.env.BOT_SECRET;
    if (!botSecret) {
      return res.status(500).json({ message: "BOT_SECRET not configured on server" });
    }
    if (!authHeader || authHeader !== `Bearer ${botSecret}`) {
      return res.status(401).json({ message: "Unauthorized bot request" });
    }
    next();
  };

  app.post("/api/bot/link-key", botAuthMiddleware, async (req, res) => {
    try {
      const { keyCode, discordId } = req.body;
      if (!keyCode || !discordId) return res.status(400).json({ ok: false, message: "keyCode and discordId required" });

      const key = await storage.getKeyByCode(keyCode.toUpperCase());
      if (!key) return res.status(404).json({ ok: false, message: "Key not found" });

      if (key.discordId && key.discordId !== discordId) {
        return res.json({ ok: false, takenByOther: true });
      }

      await storage.updateKeyDiscordId(key.id, discordId);
      return res.json({ ok: true });
    } catch (error) {
      console.error("Bot link key error:", error);
      return res.status(500).json({ ok: false, message: "Internal error" });
    }
  });

  app.get("/api/bot/user-keys", botAuthMiddleware, async (req, res) => {
    try {
      const { discordId } = req.query;
      if (!discordId) return res.status(400).json({ keys: [] });

      const keys = await storage.getKeysByDiscordId(String(discordId));
      return res.json({ keys: keys.map(k => k.keyCode) });
    } catch (error) {
      console.error("Bot user keys error:", error);
      return res.status(500).json({ keys: [] });
    }
  });

  app.post("/api/bot/unlink-key", botAuthMiddleware, async (req, res) => {
    try {
      const { keyCode } = req.body;
      if (!keyCode) return res.status(400).json({ ok: false });

      const key = await storage.getKeyByCode(keyCode.toUpperCase());
      if (!key) return res.status(404).json({ ok: false });

      await storage.updateKeyDiscordId(key.id, null);
      return res.json({ ok: true });
    } catch (error) {
      console.error("Bot unlink key error:", error);
      return res.status(500).json({ ok: false });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/webhooks/casaku", async (req, res) => {

    try {
      const secret = process.env.CASAKU_WEBHOOK_SECRET?.trim();
      if (!secret) return res.status(500).json({ message: "Casaku webhook secret belum dikonfigurasi" });

      const header = (name: string) => {
        const v = req.headers[name.toLowerCase()];
        if (!v) return null;
        return Array.isArray(v) ? String(v[0] || "") : String(v);
      };

      const providedSecret =
        header("x-webhook-secret") ||
        header("x-casaku-webhook-secret") ||
        header("x-casaku-secret") ||
        null;

      const providedSignature =
        header("x-webhook-signature") ||
        header("x-casaku-signature") ||
        header("x-signature") ||
        null;

      const providedAuth = header("authorization");

      const safeEqual = (a: string, b: string) => {
        const ab = Buffer.from(a);
        const bb = Buffer.from(b);
        if (ab.length !== bb.length) return false;
        return crypto.timingSafeEqual(ab, bb);
      };

      const rawBody = (req as any).rawBody;
      const rawBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(req.body ?? {}));

      let verified = false;
      if (providedSecret && safeEqual(providedSecret, secret)) verified = true;
      if (!verified && providedAuth && providedAuth.startsWith("Bearer ")) {
        const token = providedAuth.slice(7).trim();
        if (token && safeEqual(token, secret)) verified = true;
      }
      if (!verified && providedSignature) {
        const sig = providedSignature.trim().replace(/^sha256=/i, "");
        const hmacRawHex = crypto.createHmac("sha256", secret).update(rawBuffer).digest("hex");
        const hmacRawB64 = crypto.createHmac("sha256", secret).update(rawBuffer).digest("base64");
        const ts = header("x-webhook-timestamp") || header("x-timestamp");
        const rawText = rawBuffer.toString("utf8");
        const hmacTsRawHex = ts ? crypto.createHmac("sha256", secret).update(`${ts}${rawText}`).digest("hex") : null;
        const hmacTsRawB64 = ts ? crypto.createHmac("sha256", secret).update(`${ts}${rawText}`).digest("base64") : null;

        const candidates = [hmacRawHex, hmacRawB64, hmacTsRawHex, hmacTsRawB64].filter(Boolean) as string[];
        if (candidates.some((c) => safeEqual(c.toLowerCase(), sig.toLowerCase()))) verified = true;
      }

      const payload: any = req.body ?? {};
      if (!verified && payload.secret && safeEqual(String(payload.secret), secret)) verified = true;
      if (!verified && header("secret") && safeEqual(header("secret")!, secret)) verified = true;

      if (!verified) {
        console.error("Casaku Webhook Verification Failed:", {
          headers: req.headers,
          body: req.body,
        });
        return res.status(401).json({ message: "Unauthorized" });
      }

      const txId =
        payload.transactionId ||
        payload.transaction_id ||
        payload.txId ||
        payload.tx_id ||
        payload.data?.transactionId ||
        payload.data?.transaction_id ||
        payload.data?.id ||
        null;
      const statusRaw =
        payload.status ||
        payload.transactionStatus ||
        payload.transaction_status ||
        payload.data?.status ||
        payload.data?.transactionStatus ||
        payload.data?.transaction_status ||
        null;

      if (!txId) return res.status(400).json({ message: "Missing transactionId" });
      const remoteStatus = String(statusRaw || "").toLowerCase();

      const order = await storage.getOrderByPaymentOrderId(String(txId));
      if (!order) return res.json({ message: "Webhook processed", ok: true });

      if (order.status === "paid" || order.status === "expired" || order.status === "rejected") {
        return res.json({ message: "Webhook processed", ok: true, orderId: order.id, status: order.status });
      }

      if (remoteStatus === "paid" || remoteStatus === "success") {
        try {
          const { order: updated } = await storage.autoApproveOrderAndAssignKey(order.id);
          return res.json({ message: "Webhook processed", ok: true, orderId: updated.id, status: updated.status });
        } catch (e) {
          if (e instanceof HttpError && e.status === 409) {
            const updated = await storage.updateOrder(order.id, { status: "waiting_verification" });
            return res.json({ message: "Webhook processed", ok: true, orderId: updated?.id ?? order.id, status: "waiting_verification" });
          }
          throw e;
        }
      }

      if (remoteStatus === "expired") {
        const updated = await storage.updateOrder(order.id, { status: "expired" });
        return res.json({ message: "Webhook processed", ok: true, orderId: updated?.id ?? order.id, status: "expired" });
      }

      if (remoteStatus === "cancel" || remoteStatus === "canceled" || remoteStatus === "cancelled") {
        const updated = await storage.updateOrder(order.id, { status: "rejected" });
        return res.json({ message: "Webhook processed", ok: true, orderId: updated?.id ?? order.id, status: "rejected" });
      }

      return res.json({ message: "Webhook processed", ok: true, orderId: order.id, status: order.status });
    } catch (error) {
      console.error("Casaku webhook error:", error);
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const admin = await storage.getAdminByUsername(data.username);

      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(data.password, admin.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ adminId: admin.id }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, username: admin.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/change-password", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }

      const admin = await storage.getAdmin(req.adminId!);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const validPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateAdminPassword(admin.id, newHash);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/register", async (req, res) => {
    try {
      const data = userRegisterSchema.parse(req.body);
      const email = data.email.trim().toLowerCase();
      const username = data.username.trim();

      const [existingEmail, existingUsername] = await Promise.all([
        storage.getUserByEmail(email),
        storage.getUserByUsername(username),
      ]);
      if (existingEmail) {
        return res.status(409).json({ message: "Email sudah terdaftar" });
      }
      if (existingUsername) {
        return res.status(409).json({ message: "Username sudah dipakai" });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        username,
        email,
        passwordHash,
      });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.createOtp({
        userId: user.id,
        code,
        purpose: "verification",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      try {
        await resend.emails.send({
          from: "King Vypers <noreply@kingvypers.site>",
          to: user.email,
          subject: "Verifikasi Email King Vypers",
          html: `<p>Kode verifikasi Anda adalah: <strong>${code}</strong></p>`
        });
      } catch (err) {
        console.error("Resend error:", err);
      }

      const token = jwt.sign({ userId: user.id }, USER_JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt, avatarUrl: (user as any).avatarUrl },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("User register error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/login", async (req, res) => {
    try {
      const data = userLoginSchema.parse(req.body);
      const email = data.email.trim().toLowerCase();

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email atau password salah" });
      }

      const validPassword = await bcrypt.compare(data.password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Email atau password salah" });
      }

      if ((user as any).isBanned === 1) {
        return res.status(403).json({ message: "Akun dibanned", reason: (user as any).banReason ?? null });
      }

      if ((user as any).isEmailVerified === 0) {
        return res.status(403).json({ message: "Email belum diverifikasi", code: "UNVERIFIED_EMAIL" });
      }

      const token = jwt.sign({ userId: user.id }, USER_JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt, avatarUrl: (user as any).avatarUrl },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("User login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email dan code wajib diisi" });

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      const otp = await storage.getOtp(user.id, "verification", String(code));
      if (!otp) return res.status(400).json({ message: "Kode tidak valid" });
      if (new Date() > new Date(otp.expiresAt)) return res.status(400).json({ message: "Kode sudah kadaluarsa" });

      await storage.verifyUserEmail(user.id);
      await storage.deleteOtps(user.id, "verification");

      const token = jwt.sign({ userId: user.id }, USER_JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      console.error("Verify email error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email wajib diisi" });

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
      if ((user as any).isEmailVerified === 1) return res.status(400).json({ message: "Email sudah diverifikasi" });

      await storage.deleteOtps(user.id, "verification");

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.createOtp({
        userId: user.id,
        code,
        purpose: "verification",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      try {
        await resend.emails.send({
          from: "King Vypers <noreply@kingvypers.site>",
          to: user.email,
          subject: "Verifikasi Email (Kirim Ulang)",
          html: `<p>Kode verifikasi Anda adalah: <strong>${code}</strong></p>`
        });
      } catch (err) {
        console.error("Resend error:", err);
      }

      return res.json({ message: "Kode verifikasi telah dikirim ulang" });
    } catch (error) {
      console.error("Resend verification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email wajib diisi" });

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      await storage.deleteOtps(user.id, "reset_password");

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.createOtp({
        userId: user.id,
        code,
        purpose: "reset_password",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      try {
        await resend.emails.send({
          from: "King Vypers <noreply@kingvypers.site>",
          to: user.email,
          subject: "Reset Password",
          html: `<p>Kode reset password Anda adalah: <strong>${code}</strong></p>`
        });
      } catch (err) {
        console.error("Resend error:", err);
      }

      return res.json({ message: "Kode reset password telah dikirim" });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) return res.status(400).json({ message: "Data tidak lengkap" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Password minimal 6 karakter" });

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      const otp = await storage.getOtp(user.id, "reset_password", String(code));
      if (!otp) return res.status(400).json({ message: "Kode tidak valid" });
      if (new Date() > new Date(otp.expiresAt)) return res.status(400).json({ message: "Kode sudah kadaluarsa" });

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, newHash);
      await storage.deleteOtps(user.id, "reset_password");

      return res.json({ message: "Password berhasil diubah" });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/change-password", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const currentPassword = String(req.body?.currentPassword || "");
      const newPassword = String(req.body?.newPassword || "");
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password minimal 6 karakter" });
      }

      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) return res.status(401).json({ message: "Password lama salah" });

      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, newHash);
      return res.json({ message: "Password berhasil diubah" });
    } catch (error) {
      console.error("User change password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user/me", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ id: user.id, username: user.username, email: user.email, createdAt: user.createdAt, avatarUrl: (user as any).avatarUrl });
    } catch (error) {
      console.error("User me error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user/keys", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const rows = await storage.getKeysByUserId(req.userId!);
      const keysList = rows.map((k) => ({
        id: k.id,
        keyCode: k.keyCode,
        status: k.status,
        durationMonths: k.durationMonths,
        durationDays: k.durationDays,
        expiresAt: k.expiresAt,
        hwid: k.hwid,
        hwidResetAt: k.hwidResetAt,
        orderId: k.orderId,
        packageTitle: k.order?.package?.title ?? null,
        orderStatus: k.order?.status ?? null,
        price: k.price,
        createdAt: k.createdAt,
        loaderScript: k.loaderScript ?? null,
      }));
      return res.json({ keys: keysList });
    } catch (error) {
      console.error("User keys error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/keys/:id/reset-hwid", requireUserAuth, keyValidationLimiter, async (req: UserAuthRequest, res) => {
    try {
      const id = parseInt(String(req.params.id || ""));
      if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid key ID" });

      const key = await storage.getKey(id);
      if (!key) return res.status(404).json({ success: false, message: "Key not found" });
      if (key.userId !== req.userId) return res.status(403).json({ success: false, message: "Forbidden" });
      if (key.status === "blacklisted") return res.status(403).json({ success: false, message: "Key is blacklisted" });
      if (key.status === "expired") return res.status(403).json({ success: false, message: "Key has expired" });
      if (key.status !== "active" || !key.hwid) {
        return res.status(400).json({ success: false, message: "Key belum aktif, tidak ada HWID untuk di-reset" });
      }

      const HWID_RESET_COOLDOWN_MS = 20 * 60 * 1000;
      const now = new Date();
      const resetAt = key.hwidResetAt ? new Date(key.hwidResetAt) : null;
      const nextAllowedAt = resetAt ? new Date(resetAt.getTime() + HWID_RESET_COOLDOWN_MS) : null;
      if (nextAllowedAt && now < nextAllowedAt) {
        const minutesLeft = Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 60000);
        return res.status(429).json({
          success: false,
          message: `Bisa reset lagi dalam ${minutesLeft} menit`,
          resetAvailableAt: nextAllowedAt.toISOString(),
        });
      }

      const updated = await storage.updateKey(key.id, {
        hwid: null,
        hwidResetAt: now,
      });
      if (!updated) return res.status(500).json({ success: false, message: "Failed to reset HWID" });

      await storage.createLog({
        action: "reset",
        keyId: key.id,
        details: `HWID reset by user dashboard for key ${key.keyCode}`,
      });

      return res.json({
        success: true,
        message: "HWID berhasil di-reset. Key bisa dipakai di device baru.",
        resetAvailableAt: new Date(now.getTime() + HWID_RESET_COOLDOWN_MS).toISOString(),
      });
    } catch (error) {
      console.error("User reset HWID (auth) error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.get("/api/user/orders", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const ordersList = await storage.getOrdersByUserId(req.userId!);
      const payload = ordersList.map((o) => ({
        id: o.id,
        packageId: o.packageId,
        packageTitle: o.package?.title ?? null,
        price: o.price,
        status: o.status,
        createdAt: o.createdAt,
        payment: o.paymentProvider
          ? {
            provider: o.paymentProvider,
            orderId: o.paymentOrderId,
            linkCode: o.paymentLinkCode,
            url: o.paymentLinkUrl,
            qrString: o.paymentQrString,
            originalAmount: o.paymentOriginalAmount,
            totalAmount: o.paymentTotalAmount,
            uniqueNominal: o.paymentUniqueNominal,
            expiresAt: o.paymentExpiresAt,
          }
          : null,
      }));
      return res.json({ orders: payload });
    } catch (error) {
      console.error("User orders error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/orders", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const data = createOrderSchema.parse(req.body);
      const pkg = await storage.getPackage(data.packageId);
      if (!pkg) return res.status(404).json({ message: "Package not found" });

      const existing = await storage.getOrdersByUserId(req.userId!);
      const activeExisting = existing.find((o) => o.status === "pending");
      if (activeExisting) {
        return res.status(409).json({
          message: "Masih ada order aktif yang belum selesai. Selesaikan atau batalkan sebelum membuat order baru.",
          activeOrderId: activeExisting.id,
          activeStatus: activeExisting.status,
        });
      }

      const order = await storage.createOrder({
        userId: req.userId!,
        packageId: pkg.id,
        price: String(pkg.price),
        status: "pending",
      });

      const qrisId = process.env.CASAKU_QRIS_ID?.trim();
      if (!qrisId) return res.status(500).json({ message: "Casaku belum dikonfigurasi: CASAKU_QRIS_ID kosong" });

      const packageIds = String(process.env.CASAKU_PACKAGE_IDS || "id.dana")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (packageIds.length === 0) return res.status(500).json({ message: "Casaku belum dikonfigurasi: CASAKU_PACKAGE_IDS kosong" });
      const invalidPackageId = packageIds.find((id) => !id.includes(".") || /\s/.test(id));
      if (invalidPackageId) {
        return res.status(500).json({
          message: `CASAKU_PACKAGE_IDS tidak valid ('${invalidPackageId}'). Harus android package name, contoh: id.dana, id.ovo, com.shopee.id`,
        });
      }

      const expiredInMinutes = Math.max(1, parseInt(String(process.env.CASAKU_EXPIRED_MINUTES || "15")) || 15);
      const useUniqueCode = String(process.env.CASAKU_USE_UNIQUE_CODE || "true").toLowerCase() !== "false";
      const amount = Math.max(0, Math.round(parseFloat(String(pkg.price)) || 0));

      const payment = await casakuGenerateQrisV1({
        qrisId,
        amount,
        useUniqueCode,
        packageIds,
        expiredInMinutes,
      });

      const expiresAt = new Date(Date.now() + expiredInMinutes * 60_000);
      await storage.updateOrder(order.id, {
        paymentProvider: "casaku",
        paymentOrderId: payment.transactionId,
        paymentLinkCode: null,
        paymentLinkUrl: null,
        paymentQrString: payment.qr_string,
        paymentOriginalAmount: Math.round(payment.originalAmount || amount),
        paymentTotalAmount: Math.round(payment.totalAmount || amount),
        paymentUniqueNominal: payment.uniqueNominal ? Math.round(payment.uniqueNominal) : null,
        paymentExpiresAt: expiresAt,
      });

      return res.status(201).json({
        orderId: order.id,
        status: order.status,
        package: {
          id: pkg.id,
          title: pkg.title,
          durationDays: pkg.durationDays,
          price: String(pkg.price),
          buyLink: "",
        },
        payment: {
          provider: "casaku",
          orderId: payment.transactionId,
          linkCode: null,
          url: null,
          expiresAt: expiresAt.toISOString(),
          qrString: payment.qr_string,
          originalAmount: Math.round(payment.originalAmount || amount),
          totalAmount: Math.round(payment.totalAmount || amount),
          uniqueNominal: payment.uniqueNominal ? Math.round(payment.uniqueNominal) : null,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("User create order error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/orders/:id/confirm", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
      if (order.status !== "pending" && order.status !== "waiting_verification") {
        return res.status(400).json({ message: `Order tidak bisa dicek dari status '${order.status}'` });
      }
      if (order.paymentProvider !== "casaku" || !order.paymentOrderId) {
        return res.status(400).json({ message: "Order ini belum punya transaksi Casaku" });
      }

      const remote = await casakuCheckStatus(order.paymentOrderId);
      const remoteStatus = String(remote.status || "").toLowerCase();
      if (remoteStatus === "paid" || remoteStatus === "success") {
        try {
          const { order: updated, key } = await storage.autoApproveOrderAndAssignKey(order.id);
          return res.json({
            id: updated.id,
            status: updated.status,
            key: { id: key.id, keyCode: key.keyCode, status: key.status },
            gateway: { ok: true, message: "Pembayaran terdeteksi, key otomatis dikirim", remoteStatus },
          });
        } catch (e) {
          if (e instanceof HttpError && e.status === 409) {
            await storage.updateOrder(order.id, { status: "waiting_verification" });
            return res.json({
              id: order.id,
              status: "waiting_verification",
              gateway: { ok: true, message: "Pembayaran terdeteksi, tapi stok paket sedang kosong. Admin akan proses manual.", remoteStatus },
            });
          }
          throw e;
        }
      }
      if (remoteStatus === "expired") {
        const updated = await storage.updateOrder(order.id, { status: "expired" });
        return res.json({
          id: updated?.id ?? order.id,
          status: updated?.status ?? "expired",
          gateway: { ok: false, message: "Transaksi expired", remoteStatus },
        });
      }
      if (remoteStatus === "cancel" || remoteStatus === "canceled" || remoteStatus === "cancelled") {
        const updated = await storage.updateOrder(order.id, { status: "rejected" });
        return res.json({
          id: updated?.id ?? order.id,
          status: updated?.status ?? "rejected",
          gateway: { ok: false, message: "Transaksi dibatalkan", remoteStatus },
        });
      }

      return res.json({
        id: order.id,
        status: order.status,
        gateway: { ok: false, message: "Belum terdeteksi pembayaran (masih pending)", remoteStatus },
      });
    } catch (error) {
      console.error("User confirm payment error:", error);
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/orders/:id/payment-link", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
      if (order.status !== "pending") return res.status(400).json({ message: "Payment link hanya bisa dibuat saat status pending" });
      const qrisId = process.env.CASAKU_QRIS_ID?.trim();
      if (!qrisId) return res.status(500).json({ message: "Casaku belum dikonfigurasi: CASAKU_QRIS_ID kosong" });

      const packageIds = String(process.env.CASAKU_PACKAGE_IDS || "id.dana")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (packageIds.length === 0) return res.status(500).json({ message: "Casaku belum dikonfigurasi: CASAKU_PACKAGE_IDS kosong" });
      const invalidPackageId = packageIds.find((id) => !id.includes(".") || /\s/.test(id));
      if (invalidPackageId) {
        return res.status(500).json({
          message: `CASAKU_PACKAGE_IDS tidak valid ('${invalidPackageId}'). Harus android package name, contoh: id.dana, id.ovo, com.shopee.id`,
        });
      }

      const expiredInMinutes = Math.max(1, parseInt(String(process.env.CASAKU_EXPIRED_MINUTES || "15")) || 15);
      const useUniqueCode = String(process.env.CASAKU_USE_UNIQUE_CODE || "true").toLowerCase() !== "false";
      const amount = Math.max(0, Math.round(parseFloat(String(order.price)) || 0));

      const payment = await casakuGenerateQrisV1({
        qrisId,
        amount,
        useUniqueCode,
        packageIds,
        expiredInMinutes,
      });

      const expiresAt = new Date(Date.now() + expiredInMinutes * 60_000);
      await storage.updateOrder(order.id, {
        paymentProvider: "casaku",
        paymentOrderId: payment.transactionId,
        paymentLinkCode: null,
        paymentLinkUrl: null,
        paymentQrString: payment.qr_string,
        paymentOriginalAmount: Math.round(payment.originalAmount || amount),
        paymentTotalAmount: Math.round(payment.totalAmount || amount),
        paymentUniqueNominal: payment.uniqueNominal ? Math.round(payment.uniqueNominal) : null,
        paymentExpiresAt: expiresAt,
      });

      return res.json({
        orderId: order.id,
        status: order.status,
        payment: {
          provider: "casaku",
          orderId: payment.transactionId,
          linkCode: null,
          url: null,
          expiresAt: expiresAt.toISOString(),
          qrString: payment.qr_string,
          originalAmount: Math.round(payment.originalAmount || amount),
          totalAmount: Math.round(payment.totalAmount || amount),
          uniqueNominal: payment.uniqueNominal ? Math.round(payment.uniqueNominal) : null,
        },
      });
    } catch (error) {
      console.error("User create payment link error:", error);
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ message });
    }
  });

  app.post("/api/user/orders/:id/cancel", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
      if (order.status !== "pending") {
        return res.status(400).json({ message: `Order tidak bisa dibatalkan dari status '${order.status}'` });
      }
      const updated = await storage.updateOrder(order.id, {
        status: "rejected",
        paymentProvider: null,
        paymentOrderId: null,
        paymentLinkCode: null,
        paymentLinkUrl: null,
        paymentQrString: null,
        paymentOriginalAmount: null as any,
        paymentTotalAmount: null as any,
        paymentUniqueNominal: null as any,
        paymentExpiresAt: null as any,
      });
      return res.json({ id: updated?.id ?? order.id, status: updated?.status ?? "rejected" });
    } catch (error) {
      console.error("User cancel order error:", error);
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ─── User Avatar Upload ──────────────────────────────────────────────────
  app.post("/api/user/avatar", requireUserAuth, upload.single("avatar"), async (req: UserAuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF." });
      }

      const avatarUrl = await processAndUploadAvatar(req.file.buffer);

      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Update user avatarUrl directly via raw query
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { users } = await import("@shared/schema");
      await db.update(users).set({ avatarUrl }).where(eq(users.id, req.userId!));

      return res.json({ avatarUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      return res.status(500).json({ message: "Upload gagal. Pastikan konfigurasi R2 sudah benar." });
    }
  });

  // ─── User Testimonials ───────────────────────────────────────────────────
  app.post("/api/user/testimonials", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const { message, rating } = req.body;
      if (!message || typeof message !== "string" || message.trim().length < 10) {
        return res.status(400).json({ message: "Pesan minimal 10 karakter" });
      }
      const safeRating = Math.max(1, Math.min(5, Number(rating ?? 5)));

      const item = await storage.createTestimonial({
        userId: req.userId!,
        message: message.trim(),
        rating: safeRating,
        status: "pending",
        sortOrder: 0,
      });
      return res.status(201).json(item);
    } catch (error) {
      console.error("User create testimonial error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user/testimonials", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const all = await storage.getAllTestimonials();
      const mine = all.filter((t) => t.userId === req.userId);
      return res.json(mine);
    } catch (error) {
      console.error("User get testimonials error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/user/testimonials/:id", requireUserAuth, async (req: UserAuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const all = await storage.getAllTestimonials();
      const mine = all.find((t) => t.id === id && t.userId === req.userId);
      if (!mine) return res.status(404).json({ message: "Not found" });
      await storage.deleteTestimonial(id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      console.error("User delete testimonial error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/users", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20")) || 20));
      const offset = Math.max(0, parseInt(String(req.query.offset ?? "0")) || 0);
      const search = String(req.query.search ?? "").trim();

      const [items, total] = await Promise.all([
        storage.getUsersPaginated(limit, offset, { search }),
        storage.getUsersTotal({ search }),
      ]);

      return res.json({
        items: items.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          createdAt: u.createdAt,
          warningCount: (u as any).warningCount ?? 0,
          lastWarningAt: (u as any).lastWarningAt ?? null,
          isBanned: (u as any).isBanned ?? 0,
          bannedAt: (u as any).bannedAt ?? null,
          banReason: (u as any).banReason ?? null,
        })),
        total,
      });
    } catch (error) {
      console.error("Admin get users error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/users/:id/warn", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const updated = await storage.warnUser(id);
      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json({
        id: updated.id,
        warningCount: (updated as any).warningCount ?? 0,
        lastWarningAt: (updated as any).lastWarningAt ?? null,
      });
    } catch (error) {
      console.error("Admin warn user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/users/:id/ban", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const reason = req.body?.reason ? String(req.body.reason) : null;
      const updated = await storage.banUser(id, reason);
      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json({
        id: updated.id,
        isBanned: (updated as any).isBanned ?? 0,
        bannedAt: (updated as any).bannedAt ?? null,
        banReason: (updated as any).banReason ?? null,
      });
    } catch (error) {
      console.error("Admin ban user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/users/:id/unban", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const updated = await storage.unbanUser(id);
      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json({
        id: updated.id,
        isBanned: (updated as any).isBanned ?? 0,
        bannedAt: (updated as any).bannedAt ?? null,
        banReason: (updated as any).banReason ?? null,
      });
    } catch (error) {
      console.error("Admin unban user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const ok = await storage.deleteUser(id);
      if (!ok) return res.status(404).json({ message: "User not found" });
      return res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Admin delete user error:", error);
      const code = (error as any)?.code;
      if (code === "23503") {
        return res.status(409).json({ message: "User tidak bisa dihapus karena masih punya order/data terkait. Solusi: ban user atau hapus data terkait dulu." });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/orders", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const limitRaw = req.query.limit;
      const offsetRaw = req.query.offset;
      const status = String(req.query.status || "all");
      const wantsPagination = limitRaw !== undefined || offsetRaw !== undefined;
      const rows = wantsPagination
        ? await storage.getOrdersPaginated(
          Math.min(100, Math.max(1, parseInt(String(limitRaw ?? "20")) || 20)),
          Math.max(0, parseInt(String(offsetRaw ?? "0")) || 0),
          { status },
        )
        : await storage.getAllOrders();
      return res.json({
        orders: rows.map((o) => ({
          id: o.id,
          status: o.status,
          price: o.price,
          createdAt: o.createdAt,
          user: o.user ? { id: o.user.id, username: o.user.username, email: o.user.email } : null,
          package: o.package ? { id: o.package.id, title: o.package.title } : null,
          payment: o.paymentProvider
            ? {
              provider: o.paymentProvider,
              orderId: o.paymentOrderId,
              linkCode: o.paymentLinkCode,
              url: o.paymentLinkUrl,
              qrString: o.paymentQrString,
              originalAmount: o.paymentOriginalAmount,
              totalAmount: o.paymentTotalAmount,
              uniqueNominal: o.paymentUniqueNominal,
              expiresAt: o.paymentExpiresAt,
            }
            : null,
        })),
        ...(wantsPagination ? { total: await storage.getOrdersTotal({ status }) } : {}),
      });
    } catch (error) {
      console.error("Admin get orders error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/orders/:id/approve", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const keyCodeRaw = req.body?.keyCode;
      const keyCode = keyCodeRaw != null ? String(keyCodeRaw).trim() : "";
      const { order, key } = keyCode
        ? await storage.approveOrderAndAssignKeyByCode(id, keyCode)
        : await storage.approveOrderAndAssignKey(id);
      const gateway = null as null | { ok: boolean; message?: string };
      return res.json({
        orderId: order.id,
        status: order.status,
        key: { id: key.id, keyCode: key.keyCode, status: key.status },
        gateway,
      });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Admin approve order error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/orders/:id/reject", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const updated = await storage.rejectOrder(id);
      return res.json({ orderId: updated.id, status: updated.status });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error("Admin reject order error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/orders/:id/reset-payment", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = String(req.params.id || "");
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.status !== "pending") {
        return res.status(400).json({ message: "Reset payment hanya bisa untuk order status pending" });
      }
      const updated = await storage.updateOrder(id, {
        paymentProvider: null,
        paymentOrderId: null,
        paymentLinkCode: null,
        paymentLinkUrl: null,
        paymentQrString: null,
        paymentOriginalAmount: null,
        paymentTotalAmount: null,
        paymentUniqueNominal: null,
        paymentExpiresAt: null,
      });
      return res.json({ orderId: updated?.id ?? id, status: updated?.status ?? "pending" });
    } catch (error) {
      console.error("Admin reset payment error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/keys", authMiddleware, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 20));
      const status = (req.query.status as string) || "all";
      const search = (req.query.search as string) || "";
      const packageId = (req.query.packageId as string) || "all";
      const offset = (page - 1) * limit;

      const [keysList, total] = await Promise.all([
        storage.getKeysPaginated(limit, offset, { status, search, packageId }),
        storage.getKeysTotal({ status, search, packageId }),
      ]);
      res.json({ keys: keysList, total });
    } catch (error) {
      console.error("Get keys error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/keys/generate", authMiddleware, async (req, res) => {
    try {
      const data = generateKeysSchema.parse(req.body);
      const generatedKeys = [];
      const isLifetime = data.isLifetime === true;
      const durationMonths = isLifetime ? 0 : (data.durationMonths ?? Math.max(1, Math.ceil((data.durationDays || 0) / 30)));
      const durationDays = isLifetime ? 0 : (data.durationDays ?? undefined);

      for (let i = 0; i < data.quantity; i++) {
        let keyCode: string;
        let exists = true;

        while (exists) {
          keyCode = generateKeyCode();
          const existing = await storage.getKeyByCode(keyCode);
          exists = !!existing;
        }

        const key = await storage.createKey({
          keyCode: keyCode!,
          durationMonths,
          ...(durationDays != null ? { durationDays } : {}),
          price: data.price,
          ...(data.packageId !== undefined ? { packageId: data.packageId } : {}),
          notes: data.notes || null,
        });

        generatedKeys.push(key);

        await storage.createLog({
          action: "created",
          keyId: key.id,
          details: isLifetime ? `Lifetime key generated` : (durationDays != null ? `Key generated with ${durationDays} day duration` : `Key generated with ${durationMonths} month duration`),
        });
      }

      res.json({ keys: generatedKeys });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Generate keys error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/keys/compensate", authMiddleware, async (req, res) => {
    try {
      const data = compensateSchema.parse(req.body);
      const updatedCount = await storage.addCompensation(data.hours);

      if (updatedCount > 0) {
        await storage.createLog({
          action: "updated",
          keyId: 0,
          details: `Mass compensation applied: +${data.hours} hours to ${updatedCount} active keys`,
        });
      }

      res.json({
        success: true,
        count: updatedCount,
        message: `Berhasil menambahkan kompensasi ${data.hours} jam ke ${updatedCount} key yang sedang aktif.`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Compensate keys error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/keys/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid key ID" });
      }

      const key = await storage.getKey(id);
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }

      await storage.deleteKey(id);
      await storage.createLog({
        action: "deleted",
        keyId: null,
        details: `Key ${key.keyCode} deleted`,
      });

      res.json({ message: "Key deleted successfully" });
    } catch (error) {
      console.error("Delete key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/keys/:id/loader-script", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid key ID" });

      const key = await storage.getKey(id);
      if (!key) return res.status(404).json({ message: "Key not found" });

      const { loaderScript } = req.body as { loaderScript?: string | null };
      const updated = await storage.updateKey(id, { loaderScript: loaderScript ?? null });
      if (!updated) return res.status(500).json({ message: "Failed to update loader script" });

      return res.json({ message: "Loader script updated", key: updated });
    } catch (error) {
      console.error("Loader script update error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/keys/:id/blacklist", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid key ID" });
      }

      const key = await storage.getKey(id);
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }

      const updated = await storage.updateKey(id, { status: "blacklisted" });
      await storage.createLog({
        action: "blacklisted",
        keyId: id,
        details: `Key ${key.keyCode} blacklisted`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Blacklist key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/keys/:id/reset", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid key ID" });
      }

      const key = await storage.getKey(id);
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }

      const updated = await storage.updateKey(id, {
        hwid: null,
      });

      await storage.createLog({
        action: "reset",
        keyId: id,
        details: `Key ${key.keyCode} HWID reset`,
      });

      res.json(updated);
    } catch (error) {
      console.error("Reset key error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/validate-key", keyValidationLimiter, async (req, res) => {
    try {
      const data = validateKeySchema.parse(req.body);
      const key = await storage.getKeyByCode(data.key);

      if (!key) {
        return res.status(404).json({
          success: false,
          message: "Key not found",
        });
      }

      if (key.status === "blacklisted") {
        return res.status(403).json({
          success: false,
          message: "This key has been blacklisted",
        });
      }

      if (key.status === "expired") {
        return res.status(403).json({
          success: false,
          message: "This key has expired",
        });
      }

      if (key.status === "active") {
        if (key.hwid && key.hwid !== data.hwid) {

          return res.status(403).json({
            success: false,
            message: "This key is already bound to another device",
          });
        }

        if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
          await storage.updateKey(key.id, { status: "expired" });
          return res.status(403).json({
            success: false,
            message: "This key has expired",
          });
        }

        if (data.robloxUsername != null && data.robloxUsername !== "") {
          await storage.updateKey(key.id, { robloxUsername: data.robloxUsername });
        }

        return res.json({
          success: true,
          message: "Key validated successfully",
          expiresAt: key.expiresAt,
        });
      }

      if (key.status === "unused" || key.status === "available" || key.status === "sold") {
        const activatedAt = new Date();
        const isLifetimeKey = key.durationMonths === 0 && (key.durationDays == null || Number(key.durationDays) === 0);

        let expiresAt: Date | null = null;
        if (!isLifetimeKey) {
          expiresAt = new Date(activatedAt);
          if (key.durationDays != null && Number(key.durationDays) > 0) {
            expiresAt.setDate(expiresAt.getDate() + Number(key.durationDays));
          } else {
            expiresAt.setMonth(expiresAt.getMonth() + key.durationMonths);
          }
        }

        const updateData: { status: "active"; hwid: string; activatedAt: Date; expiresAt?: Date; robloxUsername?: string } = {
          status: "active",
          hwid: data.hwid,
          activatedAt,
        };
        if (expiresAt) {
          updateData.expiresAt = expiresAt;
        }
        if (data.robloxUsername != null && data.robloxUsername !== "") {
          updateData.robloxUsername = data.robloxUsername;
        }
        await storage.updateKey(key.id, updateData);

        await storage.createLog({
          action: "activated",
          keyId: key.id,
          details: isLifetimeKey ? `Lifetime key activated with HWID: ${data.hwid.slice(0, 12)}...` : `Key activated with HWID: ${data.hwid.slice(0, 12)}...`,
        });

        return res.json({
          success: true,
          message: "Key activated successfully",
          expiresAt: expiresAt ?? null,
        });
      }

      res.status(400).json({
        success: false,
        message: "Unknown key status",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: error.errors[0].message,
        });
      }
      console.error("Validate key error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.post("/api/script-execute", scriptExecuteLimiter, async (req, res) => {
    try {
      const data = scriptExecuteSchema.parse(req.body);
      
      // -- Trial Key Logic --
      const trialKeySetting = await storage.getSetting("trial_key");
      if (trialKeySetting && trialKeySetting.value === data.key) {
        const expiresAtSetting = await storage.getSetting("trial_expires_at");
        if (expiresAtSetting && expiresAtSetting.value && new Date(expiresAtSetting.value) < new Date()) {
          return res.status(403).json({ success: false, message: "Trial key expired" });
        }
        
        const maxSlotsSetting = await storage.getSetting("trial_max_slots");
        const maxSlots = maxSlotsSetting ? parseInt(maxSlotsSetting.value || "100") : 100;
        
        let device = await storage.getTrialDeviceByHwid(data.hwid);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        let needsSlot = true;
        
        if (device && device.isActive === 1 && new Date(device.lastSeenAt) >= tenMinutesAgo) {
          needsSlot = false; // Already occupies a valid slot
        }
        
        if (needsSlot) {
          const activeCount = await storage.getTrialDevicesTotal({ isActive: 1 });
          if (activeCount >= maxSlots) {
            return res.status(403).json({ success: false, message: "Trial slots are full. Please try again later." });
          }
        }
        
        if (!device) {
          await storage.createTrialDevice({ hwid: data.hwid, isActive: 1 });
        } else {
          await storage.updateTrialDevice(data.hwid, { isActive: 1, lastSeenAt: new Date() });
        }
        
        return res.json({
          success: true,
          executionCount: 1,
          isTrial: true,
          message: "Free trial slot acquired. Send heartbeat to /api/trial/heartbeat every 5 minutes."
        });
      }
      // -- End Trial Key Logic --

      const key = await storage.getKeyByCode(data.key);
      if (!key) {
        return res.status(404).json({ success: false, message: "Key not found" });
      }
      if (key.status === "blacklisted") {
        return res.status(403).json({ success: false, message: "Key blacklisted" });
      }
      if (key.status === "expired") {
        return res.status(403).json({ success: false, message: "Key expired" });
      }
      if (key.status !== "active" && key.status !== "available" && key.status !== "sold" && key.status !== "unused") {
        return res.status(403).json({ success: false, message: "Key not valid" });
      }
      if (key.status === "active") {
        if (key.hwid && key.hwid !== data.hwid) {
          return res.status(403).json({ success: false, message: "HWID mismatch" });
        }
        if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
          await storage.updateKey(key.id, { status: "expired" });
          return res.status(403).json({ success: false, message: "Key expired" });
        }
      }
      const updateData: { robloxUsername?: string } = {};
      if (data.robloxUsername != null && data.robloxUsername !== "") {
        updateData.robloxUsername = data.robloxUsername;
      }
      if (Object.keys(updateData).length > 0) {
        await storage.updateKey(key.id, updateData);
      }
      const updated = await storage.incrementKeyExecution(key.id);
      return res.json({
        success: true,
        executionCount: updated?.executionCount ?? key.executionCount + 1,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.errors[0].message });
      }
      console.error("Script execute error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.get("/api/check-key/:key", keyValidationLimiter, async (req, res) => {
    try {
      const keyCode = req.params.key;
      const key = await storage.getKeyByCode(keyCode);

      if (!key) {
        return res.status(404).json({
          success: false,
          message: "Key not found",
        });
      }

      if (key.status === "active" && key.expiresAt && new Date(key.expiresAt) < new Date()) {
        await storage.updateKey(key.id, { status: "expired" });
        return res.json({
          success: true,
          status: "expired",
          expiresAt: key.expiresAt,
          hwid: key.hwid,
          hwidResetAt: key.hwidResetAt,
          hwidResetCount: key.hwidResetCount,
          source: key.source,
          message: "This key has expired",
        });
      }

      res.json({
        success: true,
        status: key.status,
        expiresAt: key.expiresAt,
        hwid: key.hwid,
        hwidResetAt: key.hwidResetAt,
        hwidResetCount: key.hwidResetCount,
        source: key.source,
        discordId: key.discordId,
        message: `Key status: ${key.status}`,
      });
    } catch (error) {
      console.error("Check key error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  const HWID_RESET_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

  app.post("/api/user-reset-hwid", keyValidationLimiter, async (req, res) => {
    try {
      const { key: keyCode } = req.body;
      if (!keyCode || typeof keyCode !== "string") {
        return res.status(400).json({
          success: false,
          message: "Key is required",
        });
      }

      const key = await storage.getKeyByCode(keyCode.trim());
      if (!key) {
        return res.status(404).json({ success: false, message: "Key not found" });
      }
      if (key.status === "blacklisted") {
        return res.status(403).json({ success: false, message: "Key is blacklisted" });
      }
      if (key.status === "expired") {
        return res.status(403).json({ success: false, message: "Key has expired" });
      }
      if (key.status !== "active" || !key.hwid) {
        return res.status(400).json({ success: false, message: "Key belum aktif, tidak ada HWID untuk di-reset" });
      }

      // Limit khusus key boost server (anti jual key): maksimal 2x reset HWID
      if (key.source === "boost_reward" && (key.hwidResetCount ?? 0) >= 2) {
        return res.status(403).json({
          success: false,
          message: "Limit reset HWID untuk key boost server sudah habis (maksimal 2x).",
        });
      }

      const now = new Date();
      const resetAt = key.hwidResetAt ? new Date(key.hwidResetAt) : null;
      const nextAllowedAt = resetAt ? new Date(resetAt.getTime() + HWID_RESET_COOLDOWN_MS) : null;
      if (nextAllowedAt && now < nextAllowedAt) {
        const minutesLeft = Math.ceil((nextAllowedAt.getTime() - now.getTime()) / 60000);
        return res.status(429).json({
          success: false,
          message: `Bisa reset lagi dalam ${minutesLeft} menit`,
          resetAvailableAt: nextAllowedAt.toISOString(),
        });
      }

      const updated = await storage.updateKey(key.id, {
        hwid: null,
        hwidResetAt: now,
        hwidResetCount: (key.hwidResetCount ?? 0) + 1,
      });
      if (!updated) {
        return res.status(500).json({ success: false, message: "Failed to reset HWID" });
      }

      await storage.createLog({
        action: "reset",
        keyId: key.id,
        details: `HWID reset by user (self-service) for key ${key.keyCode}`,
      });

      return res.json({
        success: true,
        message: "HWID berhasil di-reset. Key bisa dipakai di device baru.",
        resetAvailableAt: new Date(now.getTime() + HWID_RESET_COOLDOWN_MS).toISOString(),
      });
    } catch (error) {
      console.error("User reset HWID error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // ========================
  // NEW: RESET HWID ENDPOINT (BOT)
  // ========================
  app.post("/api/reset-hwid", async (req, res) => {
    try {
      // AUTH BOT
      const authHeader = req.headers.authorization;
      const botSecret = process.env.BOT_SECRET;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const token = authHeader.split(" ")[1];
      if (!botSecret || token !== botSecret) {
        return res.status(403).json({
          success: false,
          message: "Invalid bot token",
        });
      }

      // VALIDASI BODY
      const { key } = req.body;

      if (!key) {
        return res.status(400).json({
          success: false,
          message: "Key is required",
        });
      }

      // CEK KEY
      const existingKey = await storage.getKeyByCode(key);

      if (!existingKey) {
        return res.status(404).json({
          success: false,
          message: "Key not found",
        });
      }

      if (existingKey.status === "expired") {
        return res.status(400).json({
          success: false,
          message: "Key already expired",
        });
      }

      // Limit khusus key boost server (anti jual key): maksimal 2x reset HWID
      if (existingKey.source === "boost_reward" && (existingKey.hwidResetCount ?? 0) >= 2) {
        return res.status(403).json({
          success: false,
          message: "Limit reset HWID untuk key boost server sudah habis (maksimal 2x).",
        });
      }

      // RESET HWID
      const updatedKey = await storage.updateKey(existingKey.id, {
        hwid: null,
        hwidResetAt: new Date(),
        hwidResetCount: (existingKey.hwidResetCount ?? 0) + 1,
      });

      if (!updatedKey) {
        return res.status(500).json({
          success: false,
          message: "Failed to reset HWID",
        });
      }

      // LOG (OPTIONAL)
      await storage.createLog({
        action: "reset",
        keyId: updatedKey.id,
        details: `HWID reset via Discord bot for key ${existingKey.keyCode}`,
      });

      // RESPONSE
      return res.json({
        success: true,
        message: "HWID reset successfully",
        expiresAt: updatedKey.expiresAt,
        hwidResetCount: updatedKey.hwidResetCount,
      });
    } catch (err) {
      console.error("RESET HWID ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // ========================
  // NEW: GENERATE KEY ENDPOINT (BOT - Boost Reward)
  // ========================
  app.post("/api/generate-key", async (req, res) => {
    try {
      // AUTH BOT
      const authHeader = req.headers.authorization;
      const botSecret = process.env.BOT_SECRET;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      if (!botSecret || token !== botSecret) {
        return res.status(403).json({ success: false, message: "Invalid bot token" });
      }

      // VALIDASI BODY
      const parsed = botGenerateKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || "Invalid body" });
      }

      const { durationDays, notes } = parsed.data;

      // GENERATE KEY UNIK
      let keyCode = "";
      let attempts = 0;
      do {
        keyCode = generateKeyCode();
        attempts++;
      } while (await storage.getKeyByCode(keyCode) && attempts < 10);

      const durationMonths = Math.max(1, Math.ceil(durationDays / 30));

      const created = await storage.createKey({
        keyCode,
        durationMonths,
        durationDays,
        price: "0.00",
        source: "boost_reward",
        notes: notes || "boost_reward",
      });

      await storage.createLog({
        action: "created",
        keyId: created.id,
        details: `Key ${keyCode} generated via Discord bot (boost reward, ${durationDays} hari)`,
      });

      return res.json({
        success: true,
        key: created.keyCode,
        durationDays: created.durationDays,
        expiresAt: created.expiresAt,
      });
    } catch (err) {
      console.error("GENERATE KEY ERROR:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // ========================
  // NEW: REVOKE KEY ENDPOINT (BOT - Boost Reward)
  // ========================
  app.post("/api/revoke-key", async (req, res) => {
    try {
      // AUTH BOT
      const authHeader = req.headers.authorization;
      const botSecret = process.env.BOT_SECRET;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];
      if (!botSecret || token !== botSecret) {
        return res.status(403).json({ success: false, message: "Invalid bot token" });
      }

      // VALIDASI BODY
      const parsed = botRevokeKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: parsed.error.errors[0]?.message || "Invalid body" });
      }

      const keyCode = parsed.data.key.trim().toUpperCase();

      const existingKey = await storage.getKeyByCode(keyCode);
      if (!existingKey) {
        return res.status(404).json({ success: false, message: "Key not found" });
      }

      await storage.updateKey(existingKey.id, { status: "blacklisted" });

      await storage.createLog({
        action: "blacklist",
        keyId: existingKey.id,
        details: `Key ${existingKey.keyCode} revoked via Discord bot (boost reward)`,
      });

      return res.json({
        success: true,
        message: "Key revoked successfully",
      });
    } catch (err) {
      console.error("REVOKE KEY ERROR:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.get("/api/showcase", async (req, res) => {
    try {
      const limitRaw = req.query.limit;
      const offsetRaw = req.query.offset;
      const wantsPagination = limitRaw !== undefined || offsetRaw !== undefined;
      if (wantsPagination) {
        const limit = Math.min(100, Math.max(1, parseInt(String(limitRaw ?? "20")) || 20));
        const offset = Math.max(0, parseInt(String(offsetRaw ?? "0")) || 0);
        const [items, total] = await Promise.all([
          storage.getShowcasePaginated(limit, offset),
          storage.getShowcaseTotal(),
        ]);
        return res.json({ items, total });
      }
      const items = await storage.getAllShowcase();
      return res.json(items);
    } catch (error) {
      console.error("Showcase error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/showcase", authMiddleware, async (req, res) => {
    try {
      const data = insertShowcaseSchema.parse(req.body);
      const item = await storage.createShowcase(data);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create showcase error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/showcase/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertShowcaseSchema.partial().parse(req.body);
      const item = await storage.updateShowcase(id, data);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update showcase error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/showcase/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deleteShowcase(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete showcase error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/showcase/:id/view", showcaseActionLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const item = await storage.incrementShowcaseView(id);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json({ viewCount: item.viewCount });
    } catch (error) {
      console.error("Showcase view error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/showcase/:id/like", showcaseActionLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const item = await storage.incrementShowcaseLike(id);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json({ likeCount: item.likeCount });
    } catch (error) {
      console.error("Showcase like error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/showcase/:id/tip", showcaseActionLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const item = await storage.incrementShowcaseTip(id);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json({ tipCount: item.tipCount });
    } catch (error) {
      console.error("Showcase tip error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/packages", async (req, res) => {
    try {
      const limitRaw = req.query.limit;
      const offsetRaw = req.query.offset;
      const wantsPagination = limitRaw !== undefined || offsetRaw !== undefined;
      if (wantsPagination) {
        const limit = Math.min(100, Math.max(1, parseInt(String(limitRaw ?? "20")) || 20));
        const offset = Math.max(0, parseInt(String(offsetRaw ?? "0")) || 0);
        const [items, total] = await Promise.all([
          storage.getPackagesPaginated(limit, offset),
          storage.getPackagesTotal(),
        ]);
        return res.json({ items, total });
      }
      const items = await storage.getAllPackages();
      return res.json(items);
    } catch (error) {
      console.error("Packages error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/stocks/packages", async (req, res) => {
    try {
      const items = await storage.getPackageStocks();
      return res.json({ items });
    } catch (error) {
      console.error("Package stocks error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/packages", authMiddleware, async (req, res) => {
    try {
      const data = insertPackageSchema.parse(req.body);
      const item = await storage.createPackage(data);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create package error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/packages/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertPackageSchema.partial().parse(req.body);
      const item = await storage.updatePackage(id, data);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update package error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/packages/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deletePackage(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete package error:", error);
      const code = (error as any)?.code;
      if (code === "23503") {
        return res.status(409).json({
          message: "Tidak bisa hapus paket karena sudah dipakai oleh order/key. Solusi: buat paket baru atau kosongkan stok & pastikan tidak ada order yang refer ke paket ini.",
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teams
  app.get("/api/teams", async (req, res) => {
    try {
      const limitRaw = req.query.limit;
      const offsetRaw = req.query.offset;
      const wantsPagination = limitRaw !== undefined || offsetRaw !== undefined;
      if (wantsPagination) {
        const limit = Math.min(100, Math.max(1, parseInt(String(limitRaw ?? "20")) || 20));
        const offset = Math.max(0, parseInt(String(offsetRaw ?? "0")) || 0);
        const [items, total] = await Promise.all([
          storage.getTeamsPaginated(limit, offset),
          storage.getTeamsTotal(),
        ]);
        return res.json({ items, total });
      }
      const items = await storage.getAllTeams();
      return res.json(items);
    } catch (error) {
      console.error("Teams error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Teams. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/teams", authMiddleware, async (req, res) => {
    try {
      const data = insertTeamSchema.parse(req.body);
      const item = await storage.createTeam(data);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create team error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Teams. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/teams/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertTeamSchema.partial().parse(req.body);
      const item = await storage.updateTeam(id, data);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update team error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Teams. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/teams/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deleteTeam(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete team error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Teams. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Testimonials (Public - only approved)
  app.get("/api/testimonials", async (_req, res) => {
    try {
      const items = await storage.getApprovedTestimonials();
      return res.json(items);
    } catch (error) {
      console.error("Testimonials error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin Testimonials (paginated, all statuses)
  app.get("/api/admin/testimonials", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20")) || 20));
      const offset = Math.max(0, parseInt(String(req.query.offset ?? "0")) || 0);
      const status = String(req.query.status ?? "all");
      const [items, total] = await Promise.all([
        storage.getTestimonialsPaginated(limit, offset, { status }),
        storage.getTestimonialsTotal({ status }),
      ]);
      return res.json({ items, total });
    } catch (error) {
      console.error("Admin testimonials error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Approve or reject testimonial
  app.patch("/api/admin/testimonials/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { status } = req.body;
      if (!status || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "Status harus approved, rejected, atau pending" });
      }
      const item = await storage.updateTestimonial(id, { status });
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (error) {
      console.error("Admin update testimonial error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin: Delete testimonial
  app.delete("/api/admin/testimonials/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deleteTestimonial(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Admin delete testimonial error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Game Support
  app.get("/api/game-support", async (req, res) => {
    try {
      const limitRaw = req.query.limit;
      const offsetRaw = req.query.offset;
      const wantsPagination = limitRaw !== undefined || offsetRaw !== undefined;
      if (wantsPagination) {
        const limit = Math.min(100, Math.max(1, parseInt(String(limitRaw ?? "20")) || 20));
        const offset = Math.max(0, parseInt(String(offsetRaw ?? "0")) || 0);
        const [items, total] = await Promise.all([
          storage.getGameSupportPaginated(limit, offset),
          storage.getGameSupportTotal(),
        ]);
        return res.json({ items, total });
      }
      const items = await storage.getAllGameSupport();
      return res.json(items);
    } catch (error) {
      console.error("Game support error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Game Support. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/game-support", authMiddleware, async (req, res) => {
    try {
      const data = insertGameSupportSchema.parse(req.body);
      const payload: any = {
        gameName: data.gameName,
        logoUrl: data.logoUrl,
        sortOrder: data.sortOrder,
      };
      if (data.status) payload.status = data.status;
      const item = await storage.createGameSupport(payload);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create game support error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Game Support. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/game-support/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const data = insertGameSupportSchema.partial().parse(req.body);
      const patch: any = { ...data };
      if (patch.status === undefined) delete patch.status;
      const item = await storage.updateGameSupport(id, patch);
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Update game support error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Game Support. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/game-support/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deleteGameSupport(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete game support error:", error);
      const code = (error as any)?.code;
      if (code === "42P01" || code === "42703") {
        return res.status(500).json({ message: "Database belum di-update untuk fitur Game Support. Jalankan npm run db:push." });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/revenue/stats", authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getRevenueStats();
      res.json(stats);
    } catch (error) {
      console.error("Revenue stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ─── Scripts API ─────────────────────────────────────────────────────────
  app.get("/api/scripts", authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const offset = (page - 1) * limit;

      const scripts = await storage.getScriptsPaginated(limit, offset, { search });
      const total = await storage.getScriptsTotal({ search });
      res.json({ data: scripts, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
      console.error("Get scripts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/scripts", authMiddleware, async (req, res) => {
    try {
      const { name, content, folder } = req.body;
      if (!name || !content) return res.status(400).json({ message: "Name and content are required" });
      const existing = await storage.getScriptByName(name);
      if (existing) return res.status(400).json({ message: "Script with this name already exists" });
      const script = await storage.createScript({ name, content, folder: folder || null });
      res.status(201).json(script);
    } catch (error) {
      console.error("Create script error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/scripts/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { name, content, folder } = req.body;
      if (!name || !content) return res.status(400).json({ message: "Name and content are required" });
      const script = await storage.getScript(id);
      if (!script) return res.status(404).json({ message: "Not found" });
      if (script.name !== name) {
        const existing = await storage.getScriptByName(name);
        if (existing) return res.status(400).json({ message: "Script with this name already exists" });
      }
      const updated = await storage.updateScript(id, { name, content, folder: folder || null });
      res.json(updated);
    } catch (error) {
      console.error("Update script error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/scripts/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const ok = await storage.deleteScript(id);
      if (!ok) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete script error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public Raw Endpoint
  app.get("/raw/:name", async (req, res) => {
    try {
      const userAgent = (req.headers["user-agent"] || "").toLowerCase();
      
      // Deteksi browser biasa (Chrome, Firefox, Safari, dll)
      const isBrowser = userAgent.includes("mozilla") || userAgent.includes("chrome") || userAgent.includes("safari") || userAgent.includes("edge");
      
      // Izinkan eksekutor Roblox (kalau mereka secara eksplisit pakai nama mereka)
      const isRoblox = userAgent.includes("roblox") || userAgent.includes("synapse") || userAgent.includes("krnl") || userAgent.includes("fluxus") || userAgent.includes("delta");
      
      if (isBrowser && !isRoblox) {
        // Berikan fake obfuscated script ke browser biar mereka pusing
        const fakeObfuscated = `-- Obfuscated with MoonSec V3 / Protected by KingVypers
local IllIllII = {12, 54, 12, 76, 23, 98, 11}
local llIIllII = "ERROR_UNAUTHORIZED_ENVIRONMENT"
function IIllIIll(IllllI) return setmetatable({}, {__index = function(t, k) while true do end end}) end
local Vypers = IIllIIll(IllIllII)
print("[KingVypers] Invalid execution environment detected. Aborting.")
while true do end
`;
        return res.type('text/plain').send(fakeObfuscated);
      }

      const name = req.params.name;
      const script = await storage.getScriptByName(name);
      if (!script) return res.status(404).send("-- 404: Script not found");
      res.type('text/plain').send(script.content);
    } catch (error) {
      console.error("Raw script error:", error);
      res.status(500).send("-- 500: Internal server error");
    }
  });
  // ─── Trial System Routes ───────────────────────────────────────────────
  app.get("/api/trial/config", authMiddleware, async (req, res) => {
    try {
      const trialKey = await storage.getSetting("trial_key");
      const trialMaxSlots = await storage.getSetting("trial_max_slots");
      const trialExpiresAt = await storage.getSetting("trial_expires_at");
      
      res.json({
        trialKey: trialKey?.value || "",
        trialMaxSlots: trialMaxSlots?.value ? parseInt(trialMaxSlots.value) : 100,
        trialExpiresAt: trialExpiresAt?.value || null
      });
    } catch (error) {
      console.error("Get trial config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/trial/config", authMiddleware, async (req, res) => {
    try {
      const { trialKey, trialMaxSlots, trialExpiresAt } = req.body;
      await storage.setSetting("trial_key", trialKey || null);
      await storage.setSetting("trial_max_slots", trialMaxSlots ? trialMaxSlots.toString() : "100");
      await storage.setSetting("trial_expires_at", trialExpiresAt || null);
      res.json({ success: true });
    } catch (error) {
      console.error("Set trial config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trial/devices", authMiddleware, async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const offset = Number(req.query.offset) || 0;
      const search = req.query.search ? String(req.query.search) : undefined;
      const isActiveStr = req.query.isActive as string;
      const isActive = isActiveStr === "1" ? 1 : isActiveStr === "0" ? 0 : undefined;
      
      const devices = await storage.getTrialDevicesPaginated(limit, offset, { search, isActive });
      const total = await storage.getTrialDevicesTotal({ search, isActive });
      const activeCount = await storage.getTrialDevicesTotal({ isActive: 1 });
      
      res.json({ devices, total, activeCount });
    } catch (error) {
      console.error("Get trial devices error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/trial/heartbeat", apiLimiter, async (req, res) => {
    try {
      const { hwid, key } = req.body;
      if (!hwid || !key) return res.status(400).json({ success: false });
      
      const trialKeySetting = await storage.getSetting("trial_key");
      if (!trialKeySetting || trialKeySetting.value !== key) {
        return res.status(403).json({ success: false });
      }
      
      const device = await storage.getTrialDeviceByHwid(hwid);
      if (device) {
        await storage.updateTrialDevice(hwid, { isActive: 1, lastSeenAt: new Date() });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });
  
  // Cleanup Cron (runs every 2 minutes)
  setInterval(() => {
    storage.cleanupInactiveTrialDevices(10).catch(err => {
      console.error("Failed to cleanup inactive trial devices:", err);
    });
  }, 2 * 60 * 1000);
  // ─────────────────────────────────────────────────────────────────────────

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}

async function ensureDefaultAdmin() {
  const existingAdmin = await storage.getAdminByUsername(DEFAULT_ADMIN_USERNAME);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await storage.createAdmin({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
    });
    console.log(`Default admin created: ${DEFAULT_ADMIN_USERNAME}`);
  }
}
