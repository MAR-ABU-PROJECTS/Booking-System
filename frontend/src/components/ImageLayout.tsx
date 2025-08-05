"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Props = {
	images: string[];
};

const renderImage = (
	src: string,
	className: string,
	index: number,
	onClick: () => void
) => {
	return (
		<motion.img
			key={index}
			src={src}
			alt={`Image ${index + 1}`}
			onClick={onClick}
			className={`w-full h-full object-cover object-center cursor-pointer ${className}`}
			layoutId={`image-${index}`}
		/>
	);
};

const ImageLayout = ({ images }: Props) => {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const openModal = (index: number) => setSelectedIndex(index);
	const closeModal = () => setSelectedIndex(null);

	const ShowAll = () => {
		return (
			<button
				className="!cursor-pointer text-sm font-[500] px-2.5 py-1.5 border-2 rounded-[9px] bg-white absolute right-7 bottom-5"
				onClick={() => openModal(0)}
			>
				Show All Photos
			</button>
		);
	};

	const goToPrev = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (selectedIndex !== null)
			setSelectedIndex(
				(selectedIndex - 1 + images.length) % images.length
			);
	};

	const goToNext = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (selectedIndex !== null)
			setSelectedIndex((selectedIndex + 1) % images.length);
	};

	const count = images.length;
	if (count === 0) return null;

	const renderLayout = () => {
		if (count === 1)
			return (
				<div className="h-full">
					{renderImage(images[0], "object-cover", 0, () =>
						openModal(0)
					)}
				
				</div>
			);

		if (count === 2)
			return (
				<div className="h-full grid grid-cols-2 gap-2">
					{images.map((img, i) =>
						renderImage(img, "", i, () => openModal(i))
					)}
				
				</div>
			);

		if (count === 3)
			return (
				<div className="h-full grid grid-cols-2 grid-rows-2 gap-2">
					{renderImage(images[0], "row-span-full col-span-1", 0, () =>
						openModal(0)
					)}
					{renderImage(
						images[1],
						"row-start-1 row-end-2 col-start-2",
						1,
						() => openModal(1)
					)}
					{renderImage(
						images[2],
						"row-start-2 row-end-3 col-start-2",
						2,
						() => openModal(2)
					)}
				
				</div>
			);

		if (count === 4)
			return (
				<div className="h-full grid grid-cols-5 grid-rows-2 gap-2">
					{renderImage(images[0], "row-span-full col-span-2", 0, () =>
						openModal(0)
					)}
					{renderImage(
						images[1],
						"row-start-1 row-end-2 col-start-3",
						1,
						() => openModal(1)
					)}
					{renderImage(
						images[2],
						"row-start-2 row-end-3 col-start-3",
						2,
						() => openModal(2)
					)}
					{renderImage(
						images[3],
						"row-span-full col-span-2 col-start-4",
						3,
						() => openModal(3)
					)}
				
				</div>
			);

		// 5+ images
		return (
			<div className="h-full grid grid-cols-4 grid-rows-2 gap-2 relative">
				{renderImage(images[0], "row-span-full col-span-2", 0, () =>
					openModal(0)
				)}
				{renderImage(images[1], "col-start-3 row-start-1", 1, () =>
					openModal(1)
				)}
				{renderImage(images[2], "col-start-4 row-start-1", 2, () =>
					openModal(2)
				)}
				{renderImage(images[3], "col-start-3 row-start-2", 3, () =>
					openModal(3)
				)}
				{renderImage(images[4], "col-start-4 row-start-2", 4, () =>
					openModal(4)
				)}

				<ShowAll />
			</div>
		);
	};

	return (
		<>
			{renderLayout()}

			{/* Fullscreen Modal */}
			<AnimatePresence>
				{selectedIndex !== null && (
					<motion.div
						className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={closeModal}
					>
						<button
							className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white !cursor-pointer"
							onClick={closeModal}
						>
							<X className="w-6 h-6" />
						</button>

						<motion.img
							src={images[selectedIndex]}
							alt={`Image ${selectedIndex + 1}`}
							className="max-w-5xl max-h-[80vh] rounded-lg object-contain"
							onClick={(e) => e.stopPropagation()}
							layoutId={`image-${selectedIndex}`}
						/>

						{/* Arrows */}
						<div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4">
							<button
								className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white !cursor-pointer"
								onClick={goToPrev}
							>
								<ChevronLeft className="w-6 h-6" />
							</button>
							<button
								className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white !cursor-pointer"
								onClick={goToNext}
							>
								<ChevronRight className="w-6 h-6" />
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

export default ImageLayout;
