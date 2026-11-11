import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) {
    return res.status(401).json({ success: false, message: "Invalid username or password" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ success: false, message: "Account is suspended" });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "8h" });
  res.json({
    success: true,
    token,
    user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
  });
});

export default router;