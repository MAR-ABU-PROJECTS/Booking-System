"use client";

import { useEffect } from "react";
import { Button } from "@components/ui/button";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div>
			<h2>Something went wrong!</h2>
			<button onClick={() => reset()}>Try again</button>
			<Button className="!cursor-pointer hover:bg-[#F4A857] py-[22px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl">
				Try Again
			</Button>
		</div>
	);
}
