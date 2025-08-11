"use client";

import ImageLayout from "@components/ImageLayout";
import PropertyCarousel from "@components/PropertyCarousel";
import { useIsMobile } from "@hooks/use-mobile";

interface ImageBlockProps {
	images: string[];
}

const PropertyImagesGallery = ({ images }: ImageBlockProps) => {
	const isMobile = useIsMobile();

	if (!images || images.length === 0) return null;

	return (
		<div>
			{!isMobile ? (
				<div className="md:h-[400px] lg:h-[550px] rounded-[13px] overflow-hidden mt-5">
					<ImageLayout images={images} />
				</div>
			) : (
				<div className="mt-5">
					<PropertyCarousel images={images} />
				</div>
			)}
		</div>
	);
};

export default PropertyImagesGallery;
