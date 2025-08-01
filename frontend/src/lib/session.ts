import { SessionOptions } from "iron-session";

export interface SessionData {
	id: string;
	name: string;
	email: string;
  token:string;
  isLoggedIn:boolean
}

export const defaultSession: SessionData = {
	id: '',
	name: '',
	email: '',
  token:'',
  isLoggedIn:false
};

export const sessionOptions: SessionOptions = {
	password: process.env.SECRET_KEY!,
	cookieName: "mar-abu-session",
	ttl: 24 * 60 * 60,
	cookieOptions: {
		httpOnly: true,

		// secure only works in `https` environments
		// if your localhost is not on `https`, then use: `secure: process.env.NODE_ENV === "production"`
		secure: process.env.NODE_ENV === "production",
	},
};
