"use client";
import { ReactNode } from "react";
import ReduxProvider from "./reduxprovider";
import ReactQueryClientProvider from "./QueryClientProvider";
import AuthWrapper from "@providers/authWrapper";
import { ToastContainer } from "react-toastify";

type Props = {
	children: ReactNode;
};

export default function AppProviders({ children }: Props) {
	return (
		<ReactQueryClientProvider>
			<ReduxProvider>
				<ToastContainer
					closeOnClick={false}
					closeButton={true}
					pauseOnHover={false}
					position="top-right"
					draggable={false}
					theme="colored"
					autoClose={15000}
					hideProgressBar={true}
					style={{
						color: "#ffffff",
						fontFamily: "Sora, sans-serif",
						fontSize: "14px",
						fontWeight: "600",
						borderRadius: "8px",
						textTransform: "capitalize",
						// boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
						// padding: "16px",
					}}
				/>
				<AuthWrapper>{children}</AuthWrapper>
			</ReduxProvider>
		</ReactQueryClientProvider>
	);
}
