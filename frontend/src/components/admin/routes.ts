export const Routes: Paths = {
	dashboard: {
		dashboard: {
			name: "Dashoard Overview",
			href: "/dashboard",
			desc: "Monitor property management performance",
		},
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
			dynamic: true,
		},
	},
	"admin-properties": {
		"admin-properties": {
			name: "Property Management",
			href: "/admin-properties",
			desc: "Manage Properties",
			dynamic: true,
		},
	},
	"audit-logs": {
		"audit-logs": {
			name: "Audit Logs",
			href: "/audit-logs",
			desc: "View and track system activities",
		
		},
	},
	"scheduled-cancellations": {
		"scheduled-cancellations": {
			name: "Schedules Cancellations",
			href: "/scheduled-cancellations",
			desc: "View and track system activities",
		
		},
	},
};
type Routes = Record<
	string,
	{ name: string; href: string; dynamic?: boolean; desc: string }
>;
type Paths = Record<string, Routes>;
