import { NextResponse, NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@lib/session";

export async function middleware(request: NextRequest) {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);

	if (!session?.user?.isLoggedIn) {
		return NextResponse.redirect(new URL("/log-in", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/wishlist", "/messages"],
};
