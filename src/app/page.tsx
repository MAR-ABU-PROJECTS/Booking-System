import FeaturedPage from "@/components/FeaturedPage";
import FeaturedProperties from "@/components/FeaturedProperties";
import Footer from "@/components/Footer";
import HomePage from "@/components/HomePage";

export default function Home() {
  return (
    <div>
      <HomePage />
      <FeaturedPage />
      <FeaturedProperties />
      <Footer />
    </div>
  );
}
