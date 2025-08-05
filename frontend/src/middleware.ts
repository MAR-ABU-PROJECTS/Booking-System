// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { getSessionUser } from "./lib/action";

export async function middleware(request: NextRequest) {
	const session = await getSessionUser();

	if (!session?.isLoggedIn) {
		return NextResponse.redirect(new URL("/log-in", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/wishlist", "/messages"],
};
