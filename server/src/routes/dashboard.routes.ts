import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const role = req.user!.role;
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const salesWhere: any = { status: "COMPLETED", saleDate: { gte: start } };
  if (role === "SALESMAN") salesWhere.salesmanId = req.user!.id;

  const today = await prisma.sale.aggregate({ where: salesWhere, _sum: { totalAmount: true }, _count: true });
  const data: any = {
    todaySales: Number(today._sum.totalAmount ?? 0),
    todaySalesCount: today._count,
  };

  if (role !== "SALESMAN") {
    const products = await prisma.product.findMany({ where: { status: "ACTIVE" } });
    data.productsInStock = products.filter((p) => p.quantityInStock > 0).length;
    data.lowStockProducts = products
      .filter((p) => p.quantityInStock <= p.reorderLevel)
      .map((p) => ({ id: p.id, productCode: p.productCode, productName: p.productName, quantityInStock: p.quantityInStock, reorderLevel: p.reorderLevel }));
  }

  res.json({ success: true, role, data });
});

export default router;