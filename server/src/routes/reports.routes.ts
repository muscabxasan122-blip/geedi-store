import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, requireRole("ADMINISTRATOR", "INVENTORY_MANAGER"));

router.get("/sales", async (req, res) => {
  const { from, to, salesmanId, productId } = req.query;
  const where: any = { status: "COMPLETED" };

  if (typeof from === "string" && from) where.saleDate = { ...where.saleDate, gte: new Date(from) };
  if (typeof to === "string" && to) {
    const end = new Date(to);
    end.setDate(end.getDate() + 1); // include the whole "to" day
    where.saleDate = { ...where.saleDate, lt: end };
  }
  if (typeof salesmanId === "string" && salesmanId) where.salesmanId = Number(salesmanId);
  const pid = typeof productId === "string" && productId ? Number(productId) : null;
  if (pid) where.items = { some: { productId: pid } };

  const sales = await prisma.sale.findMany({
    where,
    include: { items: true, salesman: { select: { id: true, fullName: true } } },
    orderBy: { saleDate: "desc" },
  });

  const byProduct = new Map<number, { productId: number; productName: string; quantity: number; revenue: number }>();
  let totalSales = 0;
  let totalQuantity = 0;

  for (const sale of sales) {
    const lines = pid ? sale.items.filter((i) => i.productId === pid) : sale.items;
    // with a product filter, count only that product's lines; otherwise use the sale total (after discount)
    totalSales += pid ? lines.reduce((s, l) => s + Number(l.lineTotal), 0) : Number(sale.totalAmount);
    for (const l of lines) {
      totalQuantity += l.quantity;
      const row = byProduct.get(l.productId) ?? { productId: l.productId, productName: l.productName, quantity: 0, revenue: 0 };
      row.quantity += l.quantity;
      row.revenue += Number(l.lineTotal);
      byProduct.set(l.productId, row);
    }
  }

  res.json({
    success: true,
    summary: { salesCount: sales.length, totalSales: Math.round(totalSales * 100) / 100, totalQuantity },
    byProduct: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity),
    sales: sales.map((s) => ({
      id: s.id,
      receiptNumber: s.receiptNumber,
      saleDate: s.saleDate,
      salesman: s.salesman,
      paymentMethod: s.paymentMethod,
      totalAmount: Number(s.totalAmount),
      itemCount: s.items.length,
    })),
  });
});

export default router;