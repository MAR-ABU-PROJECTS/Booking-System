"use server";
import { getIronSession } from "iron-session";
import { SessionData, defaultSession, sessionOptions } from "./session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const toDashboard = () => {
	redirect("/dashboard");
};

export async function getSession() {
	const session = await getIronSession<SessionData>(
		await cookies(),
		sessionOptions
	);
	if (!session.user.isLoggedIn) {
		session.user.isLoggedIn = defaultSession.user.isLoggedIn;
		session.user.email = defaultSession.user.email;
		session.user.name = defaultSession.user.name;
		session.user.token = defaultSession.user.token;
		session.user.id = defaultSession.user.id;
	}

	return session;
}
export async function setSession(data: {
	id: string;
	name: string;
	email: string;
	token: string;
}) {
	const session = await getSession();

	session.user.isLoggedIn = true;
	session.user.id = data.id;
	session.user.name = data.name;
	session.user.email = data.email;
	session.user.token = data.token;

	await session.save();
}

export async function logout() {
	const session = await getSession();
	session.destroy();
	redirect("/");
}
