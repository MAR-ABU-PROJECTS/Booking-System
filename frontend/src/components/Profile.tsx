"use client";
import AirbnbStyleNavigation from "./AirbnbStyleNavigation";
import Footer from "./Footer";
import ProfileGrid from "./ProfileGrid";

const Profile = () => {
	return (
		<div>
			<AirbnbStyleNavigation whiteBg />
			<ProfileGrid />
			<Footer />
		</div>
	);
};

export default Profile;
