"use client";

import { ReactNode } from "react";
import ReduxProvider from "./reduxprovider";
import ReactQueryClientProvider from "./QueryClientProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
	return (
		<ReactQueryClientProvider>
			<ReduxProvider>{children}</ReduxProvider>
		</ReactQueryClientProvider>
	);
}
