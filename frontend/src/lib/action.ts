"use server";
import { getIronSession } from "iron-session";
import { SessionData, defaultSession, sessionOptions } from "./session";
import { cookies } from "next/headers";

export async function getSession() {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);
	if (!session.user) {
		session.user = { ...defaultSession.user };
	}

	return { user: session.user };
}

export async function getSessionUser() {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);

	return {
		user: {
			id: session.user?.id,
			name: session.user?.name,
			email: session.user?.email,
			isLoggedIn: session.user?.isLoggedIn,
			role: session.user?.role,
		},
	};
}

export async function setSession(data: {
	id: string;
	name: string;
	email: string;
	token: string;
	refreshToken: string;
	rememberMe?: boolean;
	role: string;
}) {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);

	session.user = {
		isLoggedIn: true,
		id: data.id,
		name: data.name,
		email: data.email,
		token: data.token,
		refreshToken: data.refreshToken,
		role: data.role,
	};

	// const ttl = data.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24;
	const ttl = 60 * 60 * 24 * 7;

	session.updateConfig({
		...sessionOptions,
		ttl,
	});

	await session.save();
}

export async function updateSession(updates: Partial<SessionData["user"]>) {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);

	session.user = {
		...session.user,
		...updates,
	};

	await session.save();
}

export async function removeSession() {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);
	if (session) {
		session.destroy();
	}
}
