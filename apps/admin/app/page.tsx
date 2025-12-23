"use client"

import { Button } from "@repo/ui/components/ui/button";
import { toast } from "@repo/ui/components/ui/sonner";

export default function Home() {
	return (
		<div>
			<Button onClick={() => toast.success("Admin Button Clicked")}>Admin Button</Button>
			<h1 className="text-red-500">Niraj</h1>
		</div>
	);
}
