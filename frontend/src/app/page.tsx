import FeaturedPage from "@/components/FeaturedPage";
import FeaturedProperties from "@/components/FeaturedProperties";
import Footer from "@/components/Footer";
import HomePage from "@/components/HomePage";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div>
      <Navbar />
      <HomePage />
      <FeaturedPage />
      <FeaturedProperties />
      <Footer />
    </div>
  );
}
