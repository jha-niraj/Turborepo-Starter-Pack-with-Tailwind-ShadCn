"use client"

import { Button } from "@repo/ui/components/ui/button";
import { insertUser } from "../actions/user.action";

export default function Home() {
	return (
		<div>
			<Button onClick={() => insertUser()}>Main Button</Button>
		</div>
	);
}