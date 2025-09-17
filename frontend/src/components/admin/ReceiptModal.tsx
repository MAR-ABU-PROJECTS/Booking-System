import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@components/ui/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogTitle,
	AlertDialogHeader,
	AlertDialogDescription,
} from "@components/ui/alert-dialog";
import { Button } from "@components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ReceiptModalProps {
	open: boolean;
	onClose: () => void;
	receiptUrl: string | null;
	paymentId: string;
}

export const ReceiptModal = ({
	open,
	onClose,
	receiptUrl,
	paymentId,
}: ReceiptModalProps) => {
	const queryClient = useQueryClient();
	const [confirm, setConfirm] = useState(false);
	const [verify, setVerify] = useState(false);

	// const getReceipt = useQuery({
	// 	queryKey: ["receipt-image", receiptUrl],
	// 	enabled: !!receiptUrl, // Don't run if receiptUrl is null
	// 	queryFn: async () => {
	// 		const response = await apiService.get(
	// 			`/payment/receipt/${receiptUrl}`,
	// 			{
	// 				responseType: "blob",
	// 			}
	// 		);

	// 		const contentType = response.headers?.["content-type"];
	// 		const blob = new Blob([response.data], { type: contentType });
	// 		const url = URL.createObjectURL(blob);

	// 		return { url, contentType };
	// 	},
	// });

	// 🧼 Cleanup blob URL on unmount or refetch
	// useEffect(() => {
	// 	return () => {
	// 		if (getReceipt.data?.url) {
	// 			URL.revokeObjectURL(getReceipt.data.url);
	// 		}
	// 	};
	// }, [getReceipt.data]);

	const verifyReceipt = useMutation({
		mutationFn: async () => {
			return await apiService.post(
				`/payment/${paymentId}/verify-manual`,
				{
					approved: true,
					adminNotes:
						"Payment verified against bank statement. Amount matches booking total.",
				}
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["pending-verifications"],
			});
			onClose();
		},
	});

	const rejectReceipt = useMutation({
		mutationFn: async () => {
			return await apiService.post(
				`/payment/${paymentId}/reject-manual`,
				{
					reason: "Amount sent does not match booking total",
				}
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["pending-verifications"],
			});
			onClose();
		},
	});

	const get = useQuery({
		queryKey: ["receipt-image", receiptUrl],
		enabled: !!receiptUrl, // Don't run if receiptUrl is null
		queryFn: async () => {
			const response = await apiService.get(
				`/payment/receipt/${receiptUrl}`
			);

			return response;
		},
	});

	console.log(get.data);
	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="!max-w-2xl">
					<DialogHeader>
						<DialogTitle>Receipt Preview</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						{/* {getReceipt.isLoading ? (
							<div className="text-center py-10 text-muted-foreground">
								Loading receipt...
							</div>
						) : getReceipt.isError ? (
							<div className="text-center py-10 text-destructive">
								Failed to load receipt.
							</div>
						) : getReceipt.data?.contentType ===
						  "application/pdf" ? (
							<iframe
								src={getReceipt.data.url}
								title="Receipt PDF"
								className="w-full h-[500px] rounded border"
							/>
						) : getReceipt.data?.contentType?.startsWith(
								"image/"
						  ) ? (
							<img
								src={getReceipt.data.url}
								alt="Receipt"
								className="w-full h-auto rounded border"
							/>
						) : (
							<div className="text-center py-10 text-muted-foreground">
								Unsupported file type:{" "}
								{getReceipt.data?.contentType}
							</div>
						)} */}

						{/* ✅ Action Buttons */}
						<div className="flex gap-4">
							<Button
								onClick={() => {
									setConfirm(true);
									setVerify(true);
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								variant="default"
							>
								Verify
							</Button>
							<Button
								type="button"
								className="flex-1 h-[45px] text-[15px]"
								onClick={() => {
									setConfirm(true);
									setVerify(false);
								}}
								variant="destructive"
							>
								Reject
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* 🔐 Confirmation Modal (optional) */}
			
			<AlertDialog open={confirm} onOpenChange={setConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Confirm receipt {verify ? "approval" : "rejection"}
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to {verify ? "approve" : "reject"} this
							receipt?
						</AlertDialogDescription>

						<div className="flex gap-4 mt-6">
							<Button
								onClick={() => {
									verify ? verifyReceipt.mutate() : rejectReceipt.mutate();
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								disabled={
									verifyReceipt.isPending || rejectReceipt.isPending
								}
								variant="default"
							>
								{(verifyReceipt.isPending || rejectReceipt.isPending) && (
									<Loader2 className="animate-spin text-white mr-1.5" />
								)}
								Continue
							</Button>
							<Button
								type="button"
								className="flex-1 h-[45px] text-[15px]"
								onClick={() => {
									setConfirm(false);
									setVerify(true);
								}}
								variant="destructive"
								disabled={
									verifyReceipt.isPending || rejectReceipt.isPending
								}
							>
								Cancel
							</Button>
						</div>
					</AlertDialogHeader>
				</AlertDialogContent>
			</AlertDialog>
			
		</>
	);
};
