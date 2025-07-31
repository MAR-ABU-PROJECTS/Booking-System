const AuthBanner = () => {
	return (
		<div className="w-full md:flex hidden max-w-1/2 flex-col items-center justify-center relative">
			{/* Background Image */}
			<img
				src="/banner/living-area.JPG"
				alt="MAR ABU HOMES"
				className="absolute inset-0 object-cover w-full h-full"
			/>

			{/* Overlay */}
			<div className="absolute inset-0 bg-black/70 z-10" />

			{/* Optional Content over the overlay */}
			<div className="relative z-20 text-white text-center px-4">
				{/* You can put logo or text here */}
				{/* <img src="/logo/logo.png" alt="Logo" className="mb-4" /> */}
				{/* <h2 className="text-2xl font-bold">Welcome to MAR ABU HOMES</h2>
				<p className="mt-2 text-sm">Experience luxury and comfort</p> */}
			</div>
		</div>
	)
}

export default AuthBanner
