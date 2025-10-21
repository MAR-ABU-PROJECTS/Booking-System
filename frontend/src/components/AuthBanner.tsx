import Image from "next/image";

const AuthBanner = () => {
	return (
		<div className="w-full md:flex hidden max-w-1/2 flex-col items-stretch justify-center relative overflow-hidden">
			{/* Background Image */}
			<Image
				src="/banner/living-area.JPG"
				alt="MAR ABU HOMES"
				className="absolute inset-0 object-cover w-full h-full"
				fill
			/>

			<div className="absolute bottom-0 left-0 right-0 p-14 text-white z-[20]">
				<div className="h-[60px] relative mb-8">
					<img
						src="/logo/logo.png"
						alt="MAR ABU HOMES"
						className="object-contain object-left w-[260px] h-[63px]"
					/>
				</div>
				<h2 className="text-5xl font-serif font-bold mb-4">
					MAR ABU Homes
				</h2>
				<p className="text-lg text-white/90 max-w-[500px]">
					Discover luxury apartments, executive short lets, and
					premium buildings in Nigeria&apos;s most prestigious locations.
				</p>
			</div>

			{/* Overlay */}
			<div className="absolute inset-0 bg-black/70 z-10" />
		</div>
	);
};

export default AuthBanner;
