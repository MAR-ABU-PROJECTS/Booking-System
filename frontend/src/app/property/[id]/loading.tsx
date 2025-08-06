import {Loader2} from "lucide-react"

const Loading = () => {
	return (
		<div className="h-svh flex justify-center items-center">
			<Loader2 className="animate-spin text-amber-500" size={32} />
		</div>
	);
};

export default Loading;
