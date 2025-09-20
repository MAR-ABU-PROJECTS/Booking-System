"use client";
import { Loader2 } from "lucide-react";
import React, { useMemo, useEffect, useState } from "react";

interface ReceiptViewerProps {
	blob: Blob | null | undefined;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ blob }) => {
	const [loaded, setLoaded] = useState(false);

	const blobUrl = useMemo(() => {
		if (blob) {
			return URL.createObjectURL(blob);
		}
		return null;
	}, [blob]);

	useEffect(() => {
		return () => {
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
		};
	}, [blobUrl]);

	if (!blob || !blob.type) return <p>No receipt available.</p>;

	if (!blobUrl) return null;

	if (blob.type.startsWith("image/")) {
		return (
			<div className="w-full h-[450px] flex items-center">
				{!loaded ? (
					<Loader2 className="animate-spin text-amber-500 mx-auto" />
				) : (
					<img
						src={blobUrl}
						alt="Receipt"
						className={`w-full h-full object-contain object-center transition-opacity duration-300`}
					/>
				)}
				<img
					src={blobUrl}
					alt="Receipt"
					onLoad={() => setLoaded(true)}
					style={{ display: "none" }}
				/>
			</div>
		);
	}

	if (blob.type === "application/pdf") {
		return (
			<iframe
				src={blobUrl}
				title="Receipt PDF"
				className="w-full h-[450px] rounded border"
			/>
		);
	}

	return <p>Unsupported file type: {blob.type}</p>;
};

export default ReceiptViewer;
