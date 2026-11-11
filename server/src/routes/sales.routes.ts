import { Router } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, requireRole("SALESMAN", "ADMINISTRATOR"));

const PAYMENT_METHODS = ["CASH", "EVC", "E-DAHAB"];
const round2 = (n: number) => Math.round(n * 100) / 100;

class SaleError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const receiptInclude = {
  items: true,
  salesman: { select: { id: true, fullName: true } },
} as const;

// FR-005: record a sale (all-or-nothing)
router.post("/", async (req, res) => {
  const { items, discount = 0, paymentMethod } = req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Add at least one item" });
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}` });
  }
  if (typeof discount !== "number" || discount < 0) {
    return res.status(400).json({ success: false, message: "Invalid discount" });
  }
  if (discount > 0 && req.user!.role !== "ADMINISTRATOR") {
    return res.status(403).json({ success: false, message: "Only the administrator can apply discounts" });
  }

  // merge duplicate products into one line
  const wanted = new Map<number, number>();
  for (const it of items) {
    if (!Number.isInteger(it?.productId) || !Number.isInteger(it?.quantity) || it.quantity <= 0) {
      return res.status(400).json({ success: false, message: "Each item needs a productId and a positive whole quantity" });
    }
    wanted.set(it.productId, (wanted.get(it.productId) ?? 0) + it.quantity);
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const lines: {
        productId: number; productName: string; productCode: string;
        quantity: number; unitPrice: number; lineTotal: number;
      }[] = [];
      let subtotal = 0;

      for (const [productId, quantity] of wanted) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || product.status !== "ACTIVE") {
          throw new SaleError(`Product ${productId} is not available`, 404);
        }

        // FR-007 / BR-002: decrement only if enough stock remains (safe under concurrent sales)
        const dec = await tx.product.updateMany({
          where: { id: productId, quantityInStock: { gte: quantity } },
          data: { quantityInStock: { decrement: quantity } },
        });
        if (dec.count === 0) {
          throw new SaleError(
            `Not enough stock for ${product.productName}. Available: ${product.quantityInStock}, requested: ${quantity}`,
            409
          );
        }

        const unitPrice = Number(product.sellingPrice);
        const lineTotal = round2(unitPrice * quantity);
        subtotal = round2(subtotal + lineTotal);
        lines.push({ productId, productName: product.productName, productCode: product.productCode, quantity, unitPrice, lineTotal });
      }

      if (discount > subtotal) throw new SaleError("Discount cannot exceed the subtotal");

      const created = await tx.sale.create({
        data: {
          receiptNumber: `TMP-${randomUUID()}`, // replaced below with a number built from the unique id
          salesmanId: req.user!.id,
          subtotal,
          discount,
          totalAmount: round2(subtotal - discount),
          paymentMethod,
          items: { create: lines },
        },
      });

      await tx.stockMovement.createMany({
        data: lines.map((l) => ({
          productId: l.productId,
          userId: req.user!.id,
          movementType: "SALE" as const,
          quantity: l.quantity,
          saleId: created.id,
        })),
      });

      // BR-003: unique receipt number
      return tx.sale.update({
        where: { id: created.id },
        data: { receiptNumber: `GS-${String(created.id).padStart(6, "0")}` },
        include: receiptInclude,
      });
    });

    res.status(201).json({ success: true, data: sale });
  } catch (e) {
    if (e instanceof SaleError) {
      return res.status(e.status).json({ success: false, message: e.message });
    }
    throw e;
  }
});

// FR-012: search and filter. Salesmen only see their own sales (NFR-003).
router.get("/", async (req, res) => {
  const { receipt, from, to, salesmanId } = req.query;
  const where: any = {};

  if (req.user!.role === "SALESMAN") where.salesmanId = req.user!.id;
  else if (typeof salesmanId === "string" && salesmanId) where.salesmanId = Number(salesmanId);

  if (typeof receipt === "string" && receipt) {
    where.receiptNumber = { contains: receipt, mode: "insensitive" };
  }
  if (typeof from === "string" || typeof to === "string") {
    where.saleDate = {};
    if (typeof from === "string" && from) where.saleDate.gte = new Date(from);
    if (typeof to === "string" && to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1); // include the whole "to" day
      where.saleDate.lt = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: { salesman: { select: { id: true, fullName: true } } },
    orderBy: { saleDate: "desc" },
    take: 200,
  });
  res.json({ success: true, count: sales.length, data: sales });
});

// FR-006: receipt data
router.get("/:id", async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(req.params.id) },
    include: receiptInclude,
  });
  if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
  if (req.user!.role === "SALESMAN" && sale.salesmanId !== req.user!.id) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  res.json({ success: true, data: { store: "Geedi Store", ...sale } });
});

export default router;