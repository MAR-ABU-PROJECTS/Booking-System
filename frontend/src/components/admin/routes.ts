export const Routes: Paths = {
	dashboard: {
		dashboard: { name: "Manual Payments", href: "/dashboard", desc: "" },
	},
	"manual-payments": {
		"manual-payments": {
			name: "Manual Payments",
			href: "/manual-payments",
			desc: "Verify or decline submitted payment receipts.",
		},
	},
	bookings: {
		bookings: {
			name: "Bookings",
			href: "/bookings",
			desc: "Booking List",
		},
	},
};
type Routes = Record<
	string,
	{ name: string; href: string; dynamic?: boolean; desc: string }
>;
type Paths = Record<string, Routes>;
