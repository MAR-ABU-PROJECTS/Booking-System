export const Routes: Paths = {
	dashboard: {
		dashboard: { name: "Dashoard", href: "/dashboard", desc: "" },
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
	"user-management": {
		"user-management": {
			name: "User Management",
			href: "/user-management",
			desc: "Manage users account",
			dynamic:true
		},
	},
};
type Routes = Record<
	string,
	{ name: string; href: string; dynamic?: boolean; desc: string }
>;
type Paths = Record<string, Routes>;
