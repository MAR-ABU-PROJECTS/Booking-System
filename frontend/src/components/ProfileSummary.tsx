import Image from "next/image";
import { Card } from "./ui/card";
import {
	BadgeCent,
	BadgeCheck,
	BookOpen,
	Calendar,
	House,
	Mail,
	MapPin,
	Phone,
} from "lucide-react";
import photo from "@public/images/profile.png";
import { UserProfile } from "@lib/type";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import "dayjs/locale/en"; // ensure English locale is loaded
import { ProfileAvatar } from "./ProfileAvatar";

const ProfileSummary = ({ data }: { data?: UserProfile }) => {
	dayjs.extend(advancedFormat);
	dayjs.locale("en"); // set locale

	const formattedDate = `${dayjs(data?.createdAt).format("Do, MMM YYYY")}`;
	return (
		<Card className="p-5 border-2 border-[#f7d5b0] self-start">
			{/* <div className="mt-4 mx-auto relative rounded-full flex justify-center items-center overflow-hidden object-center object-cover size-[150px] mb-2">
				<Image
					src={photo}
					fill
					className="object-cover object-center"
					alt="profile pic"
				/>
			</div> */}
			<div>
				<ProfileAvatar  initialPhoto={data?.avatar as string}/>
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
					<span>{data?.email}</span>{" "}
					{data?.emailVerified ? (
						<BadgeCheck className="text-green-500 size-6" />
					) : null}
				</div>
				<div className="flex items-center gap-3">
					<Phone className="size-4 text-gray-400" />
					<span>{data?.phone}</span>
				</div>
				<div className="flex items-center gap-3">
					<Calendar className="size-4 text-gray-400" />
					<span>Member since {formattedDate}</span>
				</div>
			</div>

			<hr />
			<div>
				<h3 className="text-sm font-medium text-gray-900 text-center mb-4">
					Activity Stats
				</h3>
				<div className="grid grid-cols-2 gap-2 text-center">
					<div className="p-2 bg-gray-50 rounded-lg">
						<BookOpen className="text-gray-500 size-4 mx-auto" />

						<h4 className="text-lg font-semibold text-gray-900">
							{data?._count.bookings}
						</h4>
						<p className="text-xs text-gray-500">Bookings</p>
					</div>
					<div className="p-2 bg-gray-50 rounded-lg">
						<House className="text-gray-500 size-4 mx-auto" />

						<h4 className="text-lg font-semibold text-gray-900">
							{data?._count.hostedProperties}
						</h4>
						<p className="text-xs text-gray-500">Properties</p>
					</div>
				</div>
			</div>
		</Card>
	);
};

export default ProfileSummary;
