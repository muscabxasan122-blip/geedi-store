import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const users = [
    { fullName: "Store Owner", username: "admin", password: "admin123", role: "ADMINISTRATOR" },
    { fullName: "Inventory Manager", username: "inventory", password: "inventory123", role: "INVENTORY_MANAGER" },
    { fullName: "Ali Salesman", username: "ali", password: "ali123", role: "SALESMAN" },
  ] as const;

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        fullName: u.fullName,
        username: u.username,
        passwordHash: await bcrypt.hash(u.password, 10),
        role: u.role,
      },
    });
  }

  const products = [
    ["P001", "Samsung Galaxy A15", "Smartphones", 150, 180, 20, 5],
    ["P002", "HP Laptop 15", "Computers", 380, 450, 8, 3],
    ["P003", "Wireless Headphones", "Accessories", 20, 35, 40, 10],
    ["P004", "Phone Charger", "Accessories", 3, 6, 100, 20],
    ["P005", "USB Cable", "Accessories", 1, 3, 150, 30],
    ["P006", "Power Bank 10000mAh", "Accessories", 12, 22, 30, 8],
    ["P007", "Tecno Spark 10", "Smartphones", 110, 135, 15, 5],
    ["P008", "Phone Case", "Accessories", 2, 5, 80, 15],
    ["P009", "Bluetooth Speaker", "Electronics", 15, 28, 25, 6],
    ["P010", "Flash Drive 32GB", "Accessories", 4, 8, 60, 10],
  ] as const;

  for (const [code, name, category, cost, price, qty, reorder] of products) {
    await prisma.product.upsert({
      where: { productCode: code },
      update: {},
      create: {
        productCode: code,
        productName: name,
        category,
        costPrice: cost,
        sellingPrice: price,
        quantityInStock: qty,
        reorderLevel: reorder,
      },
    });
  }

  console.log("Users:", await prisma.user.count(), "Products:", await prisma.product.count());
}

main().finally(() => prisma.$disconnect());