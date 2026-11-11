import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, requireRole("ADMINISTRATOR"));

const safe = { id: true, fullName: true, username: true, role: true, status: true, createdAt: true } as const;
const okStr = (v: unknown) => typeof v === "string" && v.trim() !== "";

const log = (userId: number, action: string, entityId: number, details?: object) =>
  prisma.auditLog.create({ data: { userId, action, entityType: "User", entityId: String(entityId), details } });

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ where: { role: "SALESMAN" }, select: safe, orderBy: { fullName: "asc" } });
  const totals = await prisma.sale.groupBy({
    by: ["salesmanId"],
    where: { status: "COMPLETED" },
    _sum: { totalAmount: true },
    _count: true,
  });
  const byId = new Map(totals.map((t) => [t.salesmanId, t]));
  const data = users.map((u) => ({
    ...u,
    salesCount: byId.get(u.id)?._count ?? 0,
    totalSales: Number(byId.get(u.id)?._sum.totalAmount ?? 0),
  }));
  res.json({ success: true, count: data.length, data });
});

router.post("/", async (req, res) => {
  const { fullName, username, password } = req.body ?? {};
  if (!okStr(fullName) || !okStr(username) || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ success: false, message: "Full name, username and a password of at least 6 characters are required" });
  }
  try {
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        username: username.trim(),
        passwordHash: await bcrypt.hash(password, 10),
        role: "SALESMAN",
      },
      select: safe,
    });
    await log(req.user!.id, "SALESMAN_CREATED", user.id);
    res.status(201).json({ success: true, data: user });
  } catch (e: any) {
    if (e.code === "P2002") return res.status(409).json({ success: false, message: "Username already exists" });
    throw e;
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { fullName, password } = req.body ?? {};
  if (!okStr(fullName) || (password !== undefined && (typeof password !== "string" || password.length < 6))) {
    return res.status(400).json({ success: false, message: "Invalid details" });
  }
  const existing = await prisma.user.findFirst({ where: { id, role: "SALESMAN" } });
  if (!existing) return res.status(404).json({ success: false, message: "Salesman not found" });
  const user = await prisma.user.update({
    where: { id },
    data: {
      fullName: fullName.trim(),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
    select: safe,
  });
  res.json({ success: true, data: user });
});

// activate or suspend
router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return res.status(400).json({ success: false, message: "status must be ACTIVE or SUSPENDED" });
  }
  const existing = await prisma.user.findFirst({ where: { id, role: "SALESMAN" } });
  if (!existing) return res.status(404).json({ success: false, message: "Salesman not found" });
  const user = await prisma.user.update({ where: { id }, data: { status }, select: safe });
  await log(req.user!.id, `SALESMAN_${status}`, id);
  res.json({ success: true, data: user });
});

// review one salesman's recorded sales
router.get("/:id/sales", async (req, res) => {
  const id = Number(req.params.id);
  const sales = await prisma.sale.findMany({
    where: { salesmanId: id },
    orderBy: { saleDate: "desc" },
    take: 200,
  });
  const total = sales.filter((s) => s.status === "COMPLETED").reduce((sum, s) => sum + Number(s.totalAmount), 0);
  res.json({ success: true, count: sales.length, totalSales: total, data: sales });
});

export default router;