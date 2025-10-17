"use client";

import { useState } from "react";
import { CircleCheckBig, Copy, FileText, Loader2 } from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { toast } from "react-toastify";
import { SummaryData } from "@lib/type";
import { formatCurrency } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { resetBooking } from "@lib/features/bookingSlice";
import Link from "next/link";

const BookingPayment = ({
	summaryData,
	paymentId,
	instructions,
}: {
	summaryData: SummaryData;
	paymentId: string;
	instructions: string[] | undefined;
}) => {
	const dispatch = useDispatch();
	const [receipt, setReceipt] = useState<File | null>(null);
	const router = useRouter();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const file = e.target.files[0];

			const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
			const maxSize = 5 * 1024 * 1024; // 5MB

			if (!allowedTypes.includes(file.type)) {
				toast.error("Only JPG, PNG or PDF files are allowed.");
				setReceipt(null);
				return;
			}

			if (file.size > maxSize) {
				toast.error("File size must be less than 5 MB.", {
					closeOnClick: false,
					progress: undefined,
				});
				dispatch(resetBooking());
				setReceipt(null);
				return;
			}

			setReceipt(file);
		} else {
			setReceipt(null);
		}
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText("2044748043");
			toast.success("Account Number Copied", {
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
	const ratePerNight = summaryData.baseAmount;
	const nights = summaryData.nights;
	const subtotal = ratePerNight * nights;
	const cleaningFee = summaryData.cleaningFee;
	const serviceFee = summaryData.serviceFee;
	const taxes = summaryData.taxes;
	const totalAmount = subtotal + cleaningFee + serviceFee + taxes;

	const mutation = useMutation({
		mutationFn: async () => {
			if (!receipt) return;

			const formData = new FormData();
			formData.append("receipt", receipt);

			const response = await apiService.post(
				`/payment/${paymentId}/upload-receipt`,
				formData,
				{ headers: { "Content-Type": "multipart/form-data" } }
			);
			return response;
		},

		onSuccess: async (res) => {
			if (res?.success) {
				const message = res?.message as string;
				toast.success(
					<div>
						{message}
						<br />
						<Link
							href="/booking-history"
							className="text-white underline text-sm"
						>
							Click here to view your booking history
						</Link>
					</div>,
					{
						closeOnClick: false,
					}
				);

				setReceipt(null);
			} else {
				const message = res?.message as string;
				toast.error(message, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},

		onError: (error) => {
			if (isAxiosError(error)) {
				const message =
					(error.response?.data?.message as string) ||
					"Something went wrong";
				toast.error(`${message}`, {
					closeOnClick: false,
					progress: undefined,
				});
			} else {
				toast.error("Unexpected error, please try again", {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},
	});

	return (
		<div className="flex flex-col w-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] self-start">
			<div className="flex flex-col justify-center items-center">
				<h1 className="text-[18px] font-bold text-center">
					To confirm booking for the selected apartment, a payment of{" "}
					{formatCurrency(totalAmount)} is required. Kindly pay into
					our account below and upload payment receipt.
				</h1>
				<p className="text-[16px] text-[#667085] text-center">
					Secure your premium accommodation experience
				</p>
			</div>

			<div className="my-6">
				<div className="bg-amber-400 w-full rounded-xl p-4">
					<h2 className="text-[20px] font-bold text-left">
						Account Details
					</h2>

					<div className="mt-5 flex flex-col gap-3">
						<p className="font-bold">
							ACCOUNT NAME: MAR ABU PROJECT SERVICES LTD AIRBNB
						</p>

						<div className="flex items-center gap-5">
							<p className="font-bold">
								ACCOUNT NUMBER: 2044748043
							</p>{" "}
							<Button
								variant={"ghost"}
								onClick={handleCopy}
								type="button"
							>
								<Copy />
							</Button>
						</div>
						<p className="font-bold">BANK NAME: FIRST BANK</p>
					</div>
				</div>
				<p className="bg-red-500 text-center font-semibold text-[18px] mt-4 rounded-xl p-2">
					You can only continue after you have made the payment of{" "}
					{formatCurrency(totalAmount)}.
				</p>
				<h1 className="text-[17px] mb-1 font-medium mt-5">Note:</h1>
				<div className="bg-red-500 text-left font-semibold text-[18px] rounded-xl p-2">
					<ul className="list-none">
						{instructions?.map((ins, index) => (
							<li className="text-[16px]" key={index}>
								{ins}
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="w-full grid items-center gap-1">
				<Label htmlFor="file-upload">Upload Payment Receipt</Label>
				<label
					htmlFor="file-upload"
					className={`h-[150px] w-full flex flex-col justify-center items-center mx-auto border-2 border-dashed cursor-pointer rounded-xl
                  ${
						receipt
							? "bg-green-100 border-green-500 text-green-700"
							: "bg-[#fef9f3] border-[#f7d5b0] text-[#667085] hover:border-[#F4A857]"
					}`}
				>
					<div>
						{receipt ? (
							<CircleCheckBig className="text-green-600" />
						) : (
							<FileText className="text-[#F4A857]" />
						)}
					</div>
					<p
						className={`font-medium text-center ${
							receipt ? "text-green-700" : ""
						}`}
					>
						{receipt
							? "File uploaded successfully!"
							: "Click or drag file to upload"}
					</p>
					<p className="text-[12px] text-[#667085]">
						{receipt
							? "Click to change file"
							: "Supported formats: JPG, PNG, PDF (Max 5MB)"}
					</p>
					<input
						id="file-upload"
						type="file"
						accept=".jpg,.jpeg,.png,.pdf"
						className="hidden"
						onChange={handleFileChange}
					/>
					<p
						className={`text-[12px] mt-1 ${
							receipt
								? "text-green-700 font-semibold"
								: "text-[#667085]"
						}`}
					>
						{receipt ? receipt.name : "No file chosen"}
					</p>
				</label>
			</div>

			<div className="flex flex-col mt-5">
				<Button
					className="!cursor-pointer hover:bg-[#F4A857] py-[22px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
					type="button"
					disabled={!receipt}
					onClick={() => mutation.mutate()}
				>
					{mutation.isPending ? (
						<Loader2
							className="animate-spin size-5"
							strokeWidth={3}
						/>
					) : null}
					Upload Receipt
				</Button>
			</div>
		</div>
	);
};

export default BookingPayment;
