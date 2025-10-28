"use client";

import { useState } from "react";
import {
	AlertCircle,
	CircleCheckBig,
	FileText,
	Loader2,
} from "lucide-react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { toast } from "react-toastify";
import { SummaryData } from "@lib/type";
import { formatCurrency } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
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
	const cautionFee = summaryData.cautionFee;
	const totalAmount = subtotal + cautionFee;

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
				toast.error(error.message, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},
	});

	return (
		<div className="flex flex-col w-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] self-start">
			<div className="text-center">
				<h1 className="text-[22px] font-bold text-slate-900 mb-2">
					Complete Your Payment
				</h1>
				<p className="text-slate-600 max-w-[600px] mx-auto">
					To confirm your booking for the selected apartment, a
					payment of {formatCurrency(totalAmount)} is required. Kindly
					pay into our account below and upload the payment receipt.
				</p>
				<p className="text-[15px] text-slate-500 mt-2">
					Secure your premium accommodation experience
				</p>
			</div>

			<div className="">
				<div className="my-7 bg-[#fef9f3]   rounded-xl p-6 border border-amber-200">
					<h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
						<div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
							<span className="text-white text-xs font-bold">
								✓
							</span>
						</div>
						Account Details
					</h2>
					<div className="space-y-3">
						<div>
							<p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
								Account Name
							</p>
							<p className="text-slate-900 font-semibold mt-1">
								MAR ABU PROJECT SERVICES LTD AIRBNB
							</p>
						</div>
						<div>
							<p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
								Account Number
							</p>
							<div className="flex items-center gap-2 mt-1">
								<p className="text-slate-900 font-semibold">
									2044748043
								</p>
								<button
									className="p-1 hover:bg-amber-200 rounded transition-colors outline-none !cursor-pointer"
									onClick={handleCopy}
								>
									<svg
										className="w-4 h-4 text-slate-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
								</button>
							</div>
						</div>
						<div>
							<p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
								Bank Name
							</p>
							<p className="text-slate-900 font-semibold mt-1">
								FIRST BANK
							</p>
						</div>
					</div>
				</div>

				<div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<p className="text-red-900 font-semibold">
						You can only continue after you have made the payment of{" "}
						{formatCurrency(totalAmount)}.
					</p>
				</div>

				<div className="mb-2">
					<h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
						<div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
							<span className="text-white text-xs font-bold">
								!
							</span>
						</div>
						Things to Note
					</h3>
					<div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-3">
						{instructions?.map((note, index) => (
							<div key={index} className="flex items-start gap-3">
								<div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
									<span className="text-white text-xs font-bold">
										{index + 1}
									</span>
								</div>
								<p className="text-slate-700 text-sm leading-relaxed">
									{note}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="w-full grid items-center gap-1 mt-2">
				<Label htmlFor="file-upload" className="text-[15px]">
					Upload Payment Receipt
				</Label>
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
