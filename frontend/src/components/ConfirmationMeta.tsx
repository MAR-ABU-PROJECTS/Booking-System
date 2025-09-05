import { CreditCard, House, MapPin, User } from "lucide-react";
import { motion } from "framer-motion";
import Checks from "@public/animations/check.json";
import LottiePlayer from "./LottiePlayer";
import { BookingCardType } from "@lib/type";
import { formatCurrency } from "@lib/utils";
import dayjs from "dayjs";
import { forwardRef } from "react";
import { toast } from "react-toastify";

const ConfirmationMeta = forwardRef<HTMLDivElement, { data: BookingCardType }>(
	({ data }, ref) => {
		const whatsNext = [
			{
				no: 1,
				title: "Confirmation Email:",
				description:
					"Check your inbox for detailed booking confirmation and property information.",
			},
			{
				no: 2,
				title: "Check-in Instructions:",
				description:
					"You'll receive detailed check-in instructions 24 hours before your arrival.",
			},
			{
				no: 3,
				title: "Property Host Contact:",
				description:
					"Our property host will contact you to arrange any special services or transfers.",
			},
			{
				no: 4,
				title: "Welcome Package:",
				description:
					"Upon arrival, you'll receive your MAR ABU welcome package with local recommendations.",
			},
		];

		const contact = [
			{
				icon: "📞",
				title: "24/7 Hotline",
				description: "+234 801 MAR HOMES",
			},
			{
				icon: "📧",
				title: "Email Support",
				description: "bookings@marabu.com",
			},
			{
				icon: "💬",
				title: "WhatsApp",
				description: "+234 801 627 4663",
			},
			{
				icon: "🌐",
				title: "Website",
				description: "www.marabuhomes.com",
			},
		];

		const formattedCheckIn = dayjs(data.checkInDate).format("MMMM D, YYYY");
		const formattedCheckOut = dayjs(data.checkOutDate).format(
			"MMMM D, YYYY"
		);
		const subtotal = data.total * data.nights;
		const totalAmount =
			subtotal + data.cleaningFee + data.serviceFee + data.taxes;

		const handleShare = async () => {
			try {
				await navigator.clipboard.writeText(window.location.href);
				toast.success("link copied!", {
					closeOnClick: true,
					progress: undefined,
				});
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (error: any) {
				toast.error(
					`failed to copy!: ${error?.message ?? "unknown error"}`,
					{
						closeOnClick: true,
						progress: undefined,
					}
				);
			}
		};

		return (
			<div
				className="flex flex-col gap-[20px] px-[20px] lg:px-12 "
				ref={ref}
			>
				<div className="flex flex-col justify-center items-center gap-[10px]">
					<div className="w-[100px] h-[100px]">
						<LottiePlayer animationData={Checks} loop={true} />
					</div>
					<div className="flex flex-col justify-center items-center">
						<p className="text-[20px] font-bold text-[#12b76a]">
							Booking Confirmed!
						</p>
						<p className="text-[16px] text-[#667085] text-center">
							Your MAR ABU luxury experience is secured
						</p>
					</div>
					<div className="py-[3px] px-[7px] bg-[#FEF9F3] rounded-md border-1 border-[#f7d5b0]">
						<p className="text-[#F4A857] text-[18px] font-[500px]">
							Booking Reference: {data.bookingCode}
						</p>
					</div>
				</div>
				<div className="grid lg:grid-cols-[60%_35%] justify-between lg:gap-[40px] py-[30px] gap-[40px]">
					<div className="flex flex-col w-full h-full p-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] gap-[30px]">
						<div className="flex flex-col gap-[10px]">
							<div className="flex gap-[5px] items-center">
								<div className="p-[3px] bg-[#FEF9F3] rounded-md">
									<House size={"18px"} />
								</div>
								<p className="text-[18px] font-semibold">
									Your Reservation
								</p>
							</div>
							<div className="flex flex-col p-[20px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
								<div className="flex w-full h-[150px] justify-center items-center  bg-[#F4A857] rounded-xl">
									<p className="text-[30px]">🏙️</p>
								</div>
								<div>
									<div>
										<p className="text-[18px] font-semibold">
											{data.property.name}
										</p>
									</div>
									<div className="flex gap-[5px]">
										<MapPin color="red" fontSize={"10px"} />
										<p className="text-[16px] text-[#667085]">
											{data.property.city}, Nigeria
										</p>
									</div>
								</div>
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-2 mt-[10px] gap-[15px]">
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Check-in
										</p>
										<p className="text-[16px] font-[500]">
											{formattedCheckIn}
										</p>
										{/* <p className="text-[14px] text-[#667085] font-[400]">
										3:00 PM
									</p> */}
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Check-out
										</p>
										<p className="text-[16px] font-[500]">
											{formattedCheckOut}
										</p>
										{/* <p className="text-[14px] text-[#667085] font-[400]">
										11:00 PM
									</p> */}
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											duration
										</p>
										<p className="text-[16px] font-[500]">
											{data.nights}{" "}
											{data.nights > 1
												? "Nights"
												: "Night"}
										</p>
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											guests
										</p>
										<p className="text-[16px] font-[500]">
											{data.adults}{" "}
											{data.adults > 1
												? "Adults"
												: "Adult"}{" "}
											{data.children > 0 && (
												<span>
													, {data.children}{" "}
													{data.children > 1
														? "Children"
														: "Child"}
												</span>
											)}
											{data.infants > 0 && (
												<span>
													{data.infants}{" "}
													{data.infants > 1
														? "Infants"
														: "Infant"}
												</span>
											)}
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-[10px]">
							<div className="flex gap-[5px] items-center">
								<div className="p-[3px] bg-[#FEF9F3] rounded-md">
									<User size={"18px"} />
								</div>
								<p className="text-[18px] font-semibold">
									Guest Information
								</p>
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px]">
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Primary Guest
										</p>
										<p className="text-[16px] font-[500]">
											{data.guestName}
										</p>
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Email
										</p>
										<p className="text-[16px] font-[500]">
											{data.guestEmail}
										</p>
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Phone
										</p>
										<p className="text-[16px] font-[500]">
											{data.guestPhone}
										</p>
									</div>
								</div>
								{data.specialRequests && (
									<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
										<div className="flex flex-col gap-[2px]">
											<p className="text-[14px] text-[#667085] font-[400] uppercase">
												Special Requests
											</p>
											<p className="text-[16px] font-[500]">
												{data.specialRequests}
											</p>
										</div>
									</div>
								)}
							</div>
						</div>
						<div className="flex flex-col gap-[10px]">
							<div className="flex gap-[5px] items-center">
								<div className="p-[3px] bg-[#FEF9F3] rounded-md">
									<CreditCard size={"18px"} />
								</div>
								<p className="text-[18px] font-semibold">
									Payment Summary
								</p>
							</div>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px]">
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Room Rate ( {data.nights}{" "}
											{data.nights > 1
												? "Nights"
												: "Night"}
											)
										</p>
										<p className="text-[16px] font-[500]">
											{formatCurrency(
												data.baseAmount * data.nights
											)}
										</p>
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Service Fee
										</p>
										<p className="text-[16px] font-[500]">
											{formatCurrency(data.serviceFee)}
										</p>
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Cleaning Fee
										</p>
										<p className="text-[16px] font-[500]">
											{formatCurrency(data.cleaningFee)}
										</p>
									</div>
								</div>
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Taxes
										</p>
										<p className="text-[16px] font-[500]">
											{formatCurrency(data.taxes)}
										</p>
									</div>
								</div>

								{/* <div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
								<div className="flex flex-col gap-[2px]">
									<p className="text-[14px] text-[#667085] font-[400] uppercase">
										Payment Method
									</p>
									<p className="text-[16px] font-[500]">
										Bank Transfer
									</p>
								</div>
							</div> */}
								<div className="flex flex-col px-[10px] py-[5px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] gap-[10px]">
									<div className="flex flex-col gap-[2px]">
										<p className="text-[14px] text-[#667085] font-[400] uppercase">
											Total Paid
										</p>
										<p className="text-[17px] text-[#F4A857] font-[500]">
											{formatCurrency(totalAmount)}{" "}
										</p>
									</div>
								</div>
							</div>
							<div className="flex flex-col mt-[10px] gap-[20px]">
								<div className="flex flex-col p-[20px] bg-[#f4f9ff] rounded-md border-2 border-[#2e90fa] gap-[10px]">
									<div className="flex flex-col gap-[10px]">
										<div className="flex flex-row gap-1">
											📋
											<p className="text-[18px] text-[#2e90fa] font-[600]">
												What&apos;s Next?
											</p>
										</div>
										{whatsNext.map((item, index) => (
											<div
												key={index}
												className="flex items-start bg-[#fcfdff] p-[10px] gap-2 rounded-md"
											>
												<div className="w-[25px] h-[25px] bg-[#2e90fa] rounded-full flex items-center justify-center mt-[2px]">
													<p className="text-white font-semibold text-[13px] leading-none">
														{item.no}
													</p>
												</div>
												<div className="text-sm text-[#1A1A1A]">
													<p>
														<span className="font-semibold">
															{item.title}
														</span>{" "}
														{item.description}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
								<div className="flex flex-col p-[20px] bg-[#f3fbf7] rounded-md border-2 border-[#c7eedb] gap-[10px]">
									<div className="flex flex-col gap-[10px]">
										<div className="flex flex-row gap-1">
											📞
											<p className="text-[18px] text-[#1ab96f] font-[600]">
												Need Help? Contact Us
											</p>
										</div>
										<div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px]">
											{contact.map((item, index) => (
												<div
													key={index}
													className="flex flex-row bg-[#fcfdff] p-[10px] rounded-md gap-[10px]"
												>
													<div className="w-[40px] h-[40px] bg-[#1ab96f] rounded-md flex items-center justify-center mt-[2px]">
														<p className="text-white font-semibold text-[13px] leading-none">
															{item.icon}
														</p>
													</div>
													<div className="flex flex-col gap-0.5">
														<p className="text-[12px] text-[#667085]">
															{item.title}
														</p>
														<p>
															{item.description}
														</p>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="flex flex-col w-full h-[600px] lg:h-[700px] xl:h-[600px] p-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] static">
						<div className="flex flex-col gap-[20px]">
							<div className="flex items-center justify-center">
								<p className="text-[18px] font-semibold">
									Booking Status
								</p>
							</div>
							<div className="px-[20px]">
								<ol className="relative border-s-[3px] border-green-900 dark:border-green-900 dark:text-gray-400">
									<li className="mb-10 ps-6">
										<span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-200 ring-4 ring-white dark:bg-green-900 dark:ring-gray-900">
											<svg
												className="h-3.5 w-3.5 text-green-500 dark:text-green-400"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 16 12"
												aria-hidden="true"
											>
												<path
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M1 5.917 5.724 10.5 15 1.5"
												/>
											</svg>
										</span>
										<h3 className="font-medium leading-tight">
											Booking Submitted
										</h3>
										<p className="text-[15px] text-[#667085]">
											Your booking request has been
											received
										</p>
										<p className="text-[14px] text-[#667085]">
											June 12, 2024 - 2:30 PM
										</p>
									</li>

									<li className="mb-10 ps-6">
										<span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-200 ring-4 ring-white dark:bg-green-900 dark:ring-gray-900">
											<svg
												className="h-3.5 w-3.5 text-green-500 dark:text-green-400"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 16 12"
												aria-hidden="true"
											>
												<path
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M1 5.917 5.724 10.5 15 1.5"
												/>
											</svg>
										</span>
										<h3 className="font-medium leading-tight">
											Payment Received
										</h3>
										<p className="text-[15px] text-[#667085]">
											Your payment has been confirmed
										</p>
										<p className="text-[14px] text-[#667085]">
											June 12, 2024 - 2:45 PM
										</p>
									</li>

									<li className="mb-10 ps-6">
										<span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-200 ring-4 ring-white dark:bg-green-900 dark:ring-gray-900">
											<svg
												className="h-3.5 w-3.5 text-green-500 dark:text-green-400"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 16 12"
												aria-hidden="true"
											>
												<path
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M1 5.917 5.724 10.5 15 1.5"
												/>
											</svg>
										</span>
										<h3 className="font-medium leading-tight">
											Admin Approval
										</h3>
										<p className="text-[15px] text-[#667085]">
											Your booking has been approved!
										</p>
										<p className="text-[14px] text-[#667085]">
											7/11/2025, 2:22:11 AM
										</p>
									</li>

									<li className="mb-10 ps-6">
										<span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-200 ring-4 ring-white dark:bg-green-900 dark:ring-gray-900">
											<svg
												className="h-3.5 w-3.5 text-green-500 dark:text-green-400"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 16 12"
												aria-hidden="true"
											>
												<path
													stroke="currentColor"
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M1 5.917 5.724 10.5 15 1.5"
												/>
											</svg>
										</span>
										<h3 className="font-medium leading-tight">
											Confirmation Sent
										</h3>
										<p className="text-[15px] text-[#667085]">
											Official confirmation email sent
										</p>
										<p className="text-[14px] text-[#667085]">
											7/11/2025, 2:22:14 AM
										</p>
									</li>

									<li className="mb-10 ps-6 relative">
										<div className="absolute left-[-3px] top-0 h-full w-[4px] bg-[#FEF9F3] dark:bg-[#0f172a] z-10"></div>
										<span className="absolute -left-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#f7d5b0] ring-4 ring-white dark:bg-green-900 dark:ring-gray-900">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="h-4 w-4 text-[#F4A857] dark:text-green-400"
											>
												<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
												<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
											</svg>
										</span>
										<h3 className="font-medium leading-tight">
											Check-in Ready
										</h3>
										<p className="text-[15px] text-[#667085]">
											Your booking is confirmed and ready!
										</p>
										<p className="text-[14px] text-[#667085]">
											24 hours before arrival
										</p>
									</li>
								</ol>
							</div>
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-[20px] pb-[50px] print:hidden">
					<div className="grid grid-cols-1 lg:grid-cols-4 pb-[10px] gap-[15px]">
						<motion.button
							whileHover={{ y: -5 }}
							transition={{
								type: "spring",
								stiffness: 300,
							}}
							className="w-full cursor-pointer bg-black text-white font-[500] py-2 rounded-md hover:bg-[#F4A857]"
						>
							📄 Download PDF
						</motion.button>
						<motion.button
							whileHover={{ y: -5 }}
							transition={{
								type: "spring",
								stiffness: 300,
							}}
							className="w-full cursor-pointer bg-white text-black font-[500] py-2 rounded-md hover:bg-[#F4A857]"
						>
							📅 Add to Calendar
						</motion.button>
						<motion.button
							whileHover={{ y: -5 }}
							transition={{
								type: "spring",
								stiffness: 300,
							}}
							className="w-full cursor-pointer bg-transparent text-black font-[500] py-2 rounded-md border-1 border-black hover:bg-[#F4A857]"
              onClick={handleShare}
						>
							📤 Share Booking
						</motion.button>
						<motion.button
							whileHover={{ y: -5 }}
							transition={{
								type: "spring",
								stiffness: 300,
							}}
							className="w-full cursor-pointer bg-transparent text-black font-[500] py-2 rounded-md border-1 border-black hover:bg-[#F4A857]"
						>
							📍 Track Status
						</motion.button>
					</div>
					<div className="flex flex-col p-[20px] bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0] justify-center items-center gap-[4px] text-center hover:-translate-y-1 transition-transform duration-300 cursor-pointer hover:border-[#F4A857]">
						<div className="text-[32px]">📅</div>
						<h2 className="font-medium text-[18px]">
							Add to Your Calendar
						</h2>
						<p className="text-[14px] text-gray-700">
							Never miss your MAR ABU experience
						</p>
					</div>
				</div>
			</div>
		);
	}
);
ConfirmationMeta.displayName = "ConfirmationMeta";
export default ConfirmationMeta;
