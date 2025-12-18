import { PrismaClient } from "@repo/database";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Seeding database...");

	// Create a sample admin user
	const admin = await prisma.user.upsert({
		where: { email: "admin@example.com" },
		update: {},
		create: {
			email: "admin@example.com",
			name: "Admin User",
			role: "ADMIN",
		},
	});

	// Create a sample regular user
	const user = await prisma.user.upsert({
		where: { email: "user@example.com" },
		update: {},
		create: {
			email: "user@example.com",
			name: "Regular User",
			role: "USER",
		},
	});

	console.log("✅ Seeding completed!");
	console.log({ admin, user });
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
