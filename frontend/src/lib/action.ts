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
	if (!session.isLoggedIn) {
		session.isLoggedIn = defaultSession.isLoggedIn;
		session.email = defaultSession.email;
		session.name = defaultSession.name;
		session.token = defaultSession.token;
		session.id = defaultSession.id;
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

	session.isLoggedIn = true;
	session.id = data.id;
	session.name = data.name;
	session.email = data.email;
	session.token = data.token;

	await session.save();
}

export async function logout() {
	const session = await getSession();
	session.destroy();
	redirect("/");
}
