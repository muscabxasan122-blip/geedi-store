import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, requireRole("ADMINISTRATOR", "INVENTORY_MANAGER"));

router.post("/in", async (req, res) => {
  const { productId, quantity, notes } = req.body ?? {};
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: "productId and a positive whole quantity are required" });
  }
  try {
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: { quantityInStock: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: { productId, userId: req.user!.id, movementType: "STOCK_IN", quantity, notes: notes ?? null },
      });
      return updated;
    });
    res.status(201).json({ success: true, data: product });
  } catch {
    res.status(404).json({ success: false, message: "Product not found" });
  }
});

router.get("/low", async (_req, res) => {
  const all = await prisma.product.findMany({ where: { status: "ACTIVE" } });
  const low = all.filter((p) => p.quantityInStock <= p.reorderLevel);
  res.json({ success: true, count: low.length, data: low });
});

export default router;