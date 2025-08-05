import { SessionOptions } from "iron-session";

export interface SessionData {
	user: {
		id: string;
		name: string;
		email: string;
		token: string;
		isLoggedIn: boolean;
		refreshToken: string;
	};
}

export const defaultSession: SessionData = {
	user: {
		id: "",
		name: "",
		email: "",
		token: "",
		isLoggedIn: false,
		refreshToken: "",
	},
};

export const sessionOptions: SessionOptions = {
	password: process.env.SECRET_KEY!,
	cookieName: "mar-abu-session",
	ttl: 60 * 60 * 5,
	
	cookieOptions: {
		httpOnly: true,

		// secure only works in `https` environments
		// if your localhost is not on `https`, then use: `secure: process.env.NODE_ENV === "production"`
		secure: process.env.NODE_ENV === "production",
	},
};
