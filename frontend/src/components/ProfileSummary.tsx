import Image from "next/image";
import { Card } from "./ui/card";
import { Calendar, Mail, MapPin, Phone } from "lucide-react";
import photo from "@public/images/profile.png";
import { UserProfile } from "@lib/type";

const ProfileSummary = ({ data }: { data?: UserProfile }) => {
	return (
		<Card className="p-5 border-2 border-[#f7d5b0] self-start">
			<div className="mt-4 mx-auto relative rounded-full flex justify-center items-center overflow-hidden object-center object-cover size-[150px] mb-2">
				<Image
					src={photo}
					fill
					className="object-cover object-center"
					alt="profile pic"
				/>
			</div>

			<div className="space-y-1.5 text-center">
				<h2 className="text-xl font-semibold text-gray-900">
					{data?.lastName} {data?.firstName}
				</h2>
				<p className="text-gray-500 text-sm">{data?.role}</p>
			</div>

			<hr />
			<div className="flex flex-col gap-2 text-[15px] text-black">
				<div className="flex items-center gap-3">
					<Mail className="size-4 text-gray-400" />
					<span>{data?.email}</span>
				</div>
				<div className="flex items-center gap-3">
					<Phone className="size-4 text-gray-400" />
					<span>09088787654</span>
				</div>
				<div className="flex items-center gap-3">
					<MapPin className="size-4 text-gray-400" />
					<span>lekki lagos island</span>
				</div>
				<div className="flex items-center gap-3">
					<Calendar className="size-4 text-gray-400" />
					<span>Member since Aug 2025</span>
				</div>
			</div>
		</Card>
	);
};

export default ProfileSummary;
