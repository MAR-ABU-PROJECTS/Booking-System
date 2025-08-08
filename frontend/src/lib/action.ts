"use server";
import { getIronSession } from "iron-session";
import { SessionData, defaultSession, sessionOptions } from "./session";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { apiService } from "../lib/apiService";

function checkTokenExpiry(token: string): boolean {
	try {
		const decoded: { exp: number } = jwtDecode(token);
		const now = Date.now() / 1000;
		return decoded.exp < now;
	} catch (err) {
		console.log(err);
		return true;
	}
}

async function refreshAccessToken(
	refreshToken: string
): Promise<string | null> {
	try {
		const res = await apiService.post("/auth/refresh", {
			refreshToken,
		});

		if (res?.success) {
			return res.data.accessToken;
		}

		return null;
	} catch (error) {
		console.error("Token refresh failed:", error);
		return null;
	}
}

export async function getSession() {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);
	if (!session.user) {
		session.user = { ...defaultSession.user };
	}

	return session;
}

export async function getSessionUser() {
	const session = await getSession();

	if (!session.user?.isLoggedIn) {
		return { redirectTo: "/log-in", isLoggedIn: false };
	}

	const { token, refreshToken } = session.user;
	const isTokenExpired = checkTokenExpiry(token);

	if (isTokenExpired && refreshToken) {
		const newToken = await refreshAccessToken(refreshToken);

		if (newToken) {
			session.user.token = newToken;
			await session.save();
		} else {
			await session.destroy();
			return { redirectTo: "/log-in", isLoggedIn: false };
		}
	}

	return {
		user: {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			isLoggedIn: session.user.isLoggedIn,
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
}) {
	const session = await getSession();

	session.user = {
		isLoggedIn: true,
		id: data.id,
		name: data.name,
		email: data.email,
		token: data.token,
		refreshToken: data.refreshToken,
	};

	const ttl = data.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 5;

	session.updateConfig({
		...sessionOptions,
		ttl,
	});

	await session.save();
}

export async function logout() {
	const session = await getSession();
	session.destroy();
}
