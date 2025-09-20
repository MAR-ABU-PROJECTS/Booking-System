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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import ReceiptViewer from "./ReceiptViewer";
import { toast } from "react-toastify";

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
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["pending-verifications"],
			});
			onClose();
			setConfirm(false);
			toast.success(data.message as string, {
				closeOnClick: true,
				progress: undefined,
			});
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
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["pending-verifications"],
			});
			onClose();
			setConfirm(false);
			toast.success(data.message as string, {
				closeOnClick: true,
				progress: undefined,
			});
		},
	});

	const getReceipt = useQuery({
		queryKey: ["receipt-image", receiptUrl],
		enabled: !!receiptUrl,

		queryFn: async () => {
			const response = await apiService.get(
				`/payment/receipt/${receiptUrl}`,
				{
					responseType: "blob",
				}
			);

			return response;
		},
	});

	const { data: receiptBlob } = getReceipt;

	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className="!max-w-2xl">
					<DialogHeader>
						<DialogTitle>Receipt Preview</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						{getReceipt.isPending ? (
							"Loading..."
						) : getReceipt.error ? (
							getReceipt.error.message
						) : (
							<ReceiptViewer blob={receiptBlob} />
						)}

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

			<AlertDialog open={confirm} onOpenChange={setConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Confirm receipt {verify ? "approval" : "rejection"}
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to{" "}
							{verify ? "approve" : "reject"} this receipt?
						</AlertDialogDescription>

						<div className="flex gap-4 mt-6">
							<Button
								onClick={() => {
									verify
										? verifyReceipt.mutate()
										: rejectReceipt.mutate();
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								disabled={
									verifyReceipt.isPending ||
									rejectReceipt.isPending
								}
								variant="default"
							>
								{(verifyReceipt.isPending ||
									rejectReceipt.isPending) && (
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
									verifyReceipt.isPending ||
									rejectReceipt.isPending
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
