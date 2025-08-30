"use client";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface Props {
  animationData: object;
  loop?: boolean;
}

export default function LottiePlayer({ animationData, loop = true }: Props) {
  return <Lottie animationData={animationData} loop={loop}  />;
}
