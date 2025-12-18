"use server"

import { prisma } from "@repo/database"

export async function insertUser() {
    try {
        await prisma.user.create({
            data: {
                id: "1234",
                name: "Niraj Jha",
                email: "niraj@gmail.com",
                password: "nirajjha"
            }
        })

        return true
    } catch(err) {
        console.log("Error occurred while inserting the user: " + err);
    }
}