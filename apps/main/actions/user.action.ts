"use server"

import prisma from "@repo/prisma"

export async function insertUser() {
    try {
        const user = await prisma.user.create({
            data: {
                id: "1234",
                name: "Niraj Jha",
                email: "niraj@gmail.com",
                address: "Nepal"
            }
        })

        await prisma.post.create({
            data: {
                title: "Hey",
                content: "Hello",
                published: true,
                authorId: user?.id
            }
        })

        return true
    } catch(err) {
        console.log("Error occurred while inserting the user: " + err);
    }
}