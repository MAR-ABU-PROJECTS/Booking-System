"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { Button } from "@components/ui/button";
import { apiService } from "@lib/apiService";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

type ProfileAvatarProps = {
	initialPhoto?: string;
};

export function ProfileAvatar({ initialPhoto }: ProfileAvatarProps) {
	const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

	const [preview, setPreview] = useState<string | undefined>(initialPhoto);
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const triggerFilePicker = () => {
		inputRef.current?.click();
	};

	const queryClient = useQueryClient();

	useEffect(() => {
		if (initialPhoto) {
			setPreview(`${BASE_URL}${initialPhoto}`);
		}
	}, [initialPhoto]);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const localUrl = URL.createObjectURL(file);
		setPreview(localUrl);

		const formData = new FormData();
		formData.append("avatar", file);

		try {
			setUploading(true);

			await toast.promise(
				apiService.post("/users/avatar", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				}),
				{
					pending: "Uploading avatar...",
					success: {
						render({ data }) {
							if (data?.success) {
								setPreview(data.data.avatar);
								queryClient.invalidateQueries({
									queryKey: ["profile"],
								});
								return (
									data.message ||
									"Avatar uploaded successfully"
								);
							}
							throw new Error(data?.message || "Upload failed");
						},
					},
					error: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						render({ data }: { data: any }) {
							setPreview(initialPhoto);
							return data?.message || "Failed to upload avatar";
						},
					},
				},
				{
					closeOnClick: true,
				}
			);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			throw err;
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="mt-4 mx-auto relative w-[150px] h-[150px] mb-2">
			{/* Avatar */}
			<div className="relative w-full h-full rounded-full overflow-hidden border">
				<Image
					src={preview || "/images/blank-image.jpeg"}
					fill
					alt="avatar"
					className="object-cover object-center"
				/>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				id="avatar-input"
				className="hidden"
				onChange={handleFileChange}
			/>

			<label
				htmlFor="avatar-input"
				className="absolute bottom-2 right-2 cursor-pointer"
			>
				<Button
					type="button"
					size="icon"
					className="rounded-full shadow-md bg-gray-100 hover:bg-gray-200"
					disabled={uploading}
					onClick={triggerFilePicker}
				>
					<Pencil className="h-4 w-4 text-gray-700" />
				</Button>
			</label>
		</div>
	);
}
