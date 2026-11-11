import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const manage = requireRole("ADMINISTRATOR", "INVENTORY_MANAGER");

function parse(body: any) {
  const { productCode, productName, category, costPrice, sellingPrice, quantityInStock = 0, reorderLevel = 0 } = body ?? {};
  const okStr = (v: unknown) => typeof v === "string" && v.trim() !== "";
  if (!okStr(productCode) || !okStr(productName) || !okStr(category)) return null;
  if (typeof costPrice !== "number" || costPrice < 0) return null;
  if (typeof sellingPrice !== "number" || sellingPrice <= 0) return null;
  if (!Number.isInteger(quantityInStock) || quantityInStock < 0) return null;
  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) return null;
  return {
    productCode: productCode.trim(),
    productName: productName.trim(),
    category: category.trim(),
    costPrice,
    sellingPrice,
    quantityInStock,
    reorderLevel,
  };
}

// FR-012: search by name or code. Salesmen see active products and no cost price.
router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const isManager = req.user!.role !== "SALESMAN";
  const products = await prisma.product.findMany({
    where: {
      ...(isManager ? {} : { status: "ACTIVE" }),
      ...(q
        ? {
            OR: [
              { productName: { contains: q, mode: "insensitive" } },
              { productCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { productName: "asc" },
  });
  const data = products.map(({ costPrice, ...p }) => ({
    ...p,
    ...(isManager ? { costPrice } : {}),
    lowStock: p.quantityInStock <= p.reorderLevel, // FR-004 low-stock flag
  }));
  res.json({ success: true, count: data.length, data });
});

router.post("/", manage, async (req, res) => {
  const p = parse(req.body);
  if (!p) return res.status(400).json({ success: false, message: "Please provide valid product details" });
  try {
    const product = await prisma.product.create({
      data: {
        ...p,
        stockMovements: p.quantityInStock > 0
          ? { create: { userId: req.user!.id, movementType: "STOCK_IN", quantity: p.quantityInStock, notes: "Opening stock" } }
          : undefined,
      },
    });
    res.status(201).json({ success: true, data: product });
  } catch (e: any) {
    if (e.code === "P2002") return res.status(409).json({ success: false, message: "Product code already exists" });
    throw e;
  }
});

// Edit details only; quantity changes go through /api/stock
router.put("/:id", manage, async (req, res) => {
  const p = parse(req.body);
  if (!p) return res.status(400).json({ success: false, message: "Please provide valid product details" });
  const { quantityInStock, ...details } = p;
  try {
    const product = await prisma.product.update({ where: { id: Number(req.params.id) }, data: details });
    res.json({ success: true, data: product });
  } catch (e: any) {
    if (e.code === "P2025") return res.status(404).json({ success: false, message: "Product not found" });
    if (e.code === "P2002") return res.status(409).json({ success: false, message: "Product code already exists" });
    throw e;
  }
});

// FR-003: deactivate, never delete
router.patch("/:id/deactivate", manage, async (req, res) => {
  try {
    const product = await prisma.product.update({ where: { id: Number(req.params.id) }, data: { status: "INACTIVE" } });
    res.json({ success: true, data: product });
  } catch {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

router.patch("/:id/activate", manage, async (req, res) => {
  try {
    const product = await prisma.product.update({ where: { id: Number(req.params.id) }, data: { status: "ACTIVE" } });
    res.json({ success: true, data: product });
  } catch {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

export default router;