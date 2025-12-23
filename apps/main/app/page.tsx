"use client"

import { Button } from "@repo/ui/components/ui/button";
import { insertUser } from "../actions/user.action";
import { toast } from "@repo/ui/components/ui/sonner";
import { ThemeToggle } from "@repo/ui/components/themetoggle";

export default function Home() {
	return (
		<div>
			<Button
				onClick={() => toast.success("Hey")}
				className="cursor-pointer"
			>
				Main Button
			</Button>
			<ThemeToggle />
		</div>
	);
}