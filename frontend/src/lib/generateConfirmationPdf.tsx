import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { BookingCardType } from "./type";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { getBase64ImageFromUrl } from "./utils";
import { formatCurrency } from "./utils";
dayjs.extend(advancedFormat);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfMake as any).vfs = pdfFonts.vfs;

export const generateConfirmationPdf = async (data: BookingCardType) => {
	const formattedCheckIn = dayjs(data.checkInDate).format("MMMM Do, YYYY");
	const formattedCheckOut = dayjs(data.checkOutDate).format("MMMM Do, YYYY");
	const subtotal = data.total * data.nights;
	const totalAmount =
		subtotal + data.cleaningFee + data.cleaningFee + data.taxes;

	const formatCautionFee = formatCurrency(data.cautionFee);
	const formattedTaxes = formatCurrency(data.taxes);
	const formattedCleaningFee = formatCurrency(data.cleaningFee);
	const formatTotalNights = formatCurrency(data.baseAmount * data.nights);
  const formattedTotal = formatCurrency(totalAmount)

	const logoUrl = "/logo/black-logo.png";
	const logoBase64 = await getBase64ImageFromUrl(logoUrl);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const docDefinition: any = {
		content: [
			// Header with logo + title
			{
				columns: [
					{ image: logoBase64, width: 80 },
					{
						text: "Booking Confirmation Receipt",
						style: "header",
						alignment: "right",
						margin: [0, 15, 0, 0],
					},
				],
			},

			{
				text: "Your Reservation",
				style: "sectionHeader",
				margin: [0, 20, 0, 5],
			},
			{
				style: "box",
				table: {
					widths: ["*", "*"],
					body: [
						[
							{ text: "Property", style: "label" },
							data.property.name,
						],
						[
							{ text: "Location", style: "label" },
							`${data.property.city}, Nigeria`,
						],
						[
							{ text: "Check-in", style: "label" },
							formattedCheckIn,
						],
						[
							{ text: "Check-out", style: "label" },
							formattedCheckOut,
						],
						[
							{ text: "Duration", style: "label" },
							`${data.nights} Night(s)`,
						],
					],
				},
				layout: {
					fillColor: (rowIndex: number) =>
						rowIndex % 2 === 0 ? "#FEF9F3" : null,
					hLineColor: () => "#f7d5b0",
					vLineColor: () => "#f7d5b0",
				},
			},

			{
				text: "Guest Information",
				style: "sectionHeader",
				margin: [0, 20, 0, 5],
			},
			{
				style: "box",
				table: {
					widths: ["*", "*"],
					body: [
						[
							{ text: "Guest Name", style: "label" },
							data.guestName,
						],
						[{ text: "Email", style: "label" }, data.guestEmail],
						[{ text: "Phone", style: "label" }, data.guestPhone],
					],
				},
				layout: {
					fillColor: (rowIndex: number) =>
						rowIndex % 2 === 0 ? "#FEF9F3" : null,
					hLineColor: () => "#f7d5b0",
					vLineColor: () => "#f7d5b0",
				},
			},

			{
				text: "Payment Summary",
				style: "sectionHeader",
				margin: [0, 20, 0, 5],
			},
			{
				style: "box",
				table: {
					widths: ["*", "*"],
					body: [
						["Total Nights", formatTotalNights],
						["Caution Fee", formatCautionFee],
						["Cleaning Fee", formattedCleaningFee],
						["Taxes", formattedTaxes],
						[
							{ text: "Total Paid", style: "label" },
							{ text: formattedTotal, bold: true, color: "#F4A857" },
						],
					],
				},
				layout: {
					fillColor: (rowIndex: number) =>
						rowIndex % 2 === 0 ? "#FEF9F3" : null,
					hLineColor: () => "#f7d5b0",
					vLineColor: () => "#f7d5b0",
				},
			},
		],

		styles: {
			header: { fontSize: 18, bold: true },
			sectionHeader: {
				fontSize: 14,
				bold: true,
				color: "#2e90fa",
				margin: [0, 10, 0, 5],
				decoration: "underline",
				decorationColor: "#f7d5b0",
			},
			box: { margin: [0, 5, 0, 15] },
			label: { bold: true, color: "#667085" },
		},

		footer: (currentPage: number, pageCount: number) => {
			return {
				columns: [
					{
						text: "Mar Abu Homes\n📞 +234 801 MAR HOMES   ✉️ bookings@marabu.com",
						fontSize: 9,
						color: "#667085",
						margin: [40, 0, 0, 0],
					},
					{
						text: `Page ${currentPage} of ${pageCount}`,
						alignment: "right",
						fontSize: 9,
						margin: [0, 0, 40, 0],
						color: "#999999",
					},
				],
			};
		},
	};

	pdfMake
		.createPdf(docDefinition)
		.download(`Mar_Abu_Booking_Confirmation_${data.bookingCode}.pdf`);
};
