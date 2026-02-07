import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create categories
  const electronics = await prisma.category.create({
    data: {
      name: "Electronics",
      description: "Electronic devices and accessories",
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: "Clothing",
      description: "Apparel and fashion items",
    },
  });

  const groceries = await prisma.category.create({
    data: {
      name: "Groceries",
      description: "Food and daily essentials",
    },
  });

  console.log("Categories created");

  // Create sample user
  const user = await prisma.user.create({
    data: {
      email: "admin@mncollection.lk",
      name: "Admin User",
      password: "hashed_password_here", // In production, use proper hashing
      role: "ADMIN",
    },
  });

  console.log("User created");

  // Create sample products
  const products = await prisma.product.createMany({
    data: [
      {
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        sku: "ELC-001",
        barcode: "1234567890001",
        price: 2500,
        costPrice: 1800,
        stock: 50,
        minStock: 10,
        categoryId: electronics.id,
      },
      {
        name: "USB Cable",
        description: "Type-C USB cable 1m",
        sku: "ELC-002",
        barcode: "1234567890002",
        price: 500,
        costPrice: 300,
        stock: 100,
        minStock: 20,
        categoryId: electronics.id,
      },
      {
        name: "T-Shirt",
        description: "Cotton t-shirt",
        sku: "CLO-001",
        barcode: "1234567890003",
        price: 1500,
        costPrice: 800,
        stock: 30,
        minStock: 10,
        categoryId: clothing.id,
      },
      {
        name: "Jeans",
        description: "Denim jeans",
        sku: "CLO-002",
        barcode: "1234567890004",
        price: 3500,
        costPrice: 2000,
        stock: 20,
        minStock: 5,
        categoryId: clothing.id,
      },
      {
        name: "Rice 1kg",
        description: "Premium white rice",
        sku: "GRO-001",
        barcode: "1234567890005",
        price: 250,
        costPrice: 180,
        stock: 200,
        minStock: 50,
        unit: "kg",
        categoryId: groceries.id,
      },
    ],
  });

  console.log("Products created");

  // Create a sample sale
  const sale = await prisma.sale.create({
    data: {
      saleNumber: "SALE-" + Date.now(),
      subtotal: 4500,
      tax: 0,
      discount: 0,
      total: 4500,
      paymentMethod: "CASH",
      cashierId: user.id,
      customerName: "Walk-in Customer",
      saleItems: {
        create: [
          {
            productId: (await prisma.product.findFirst({ where: { sku: "ELC-001" } }))!.id,
            quantity: 1,
            price: 2500,
            subtotal: 2500,
          },
          {
            productId: (await prisma.product.findFirst({ where: { sku: "CLO-002" } }))!.id,
            quantity: 1,
            price: 3500,
            subtotal: 3500,
          },
        ],
      },
    },
  });

  console.log("Sample sale created");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
