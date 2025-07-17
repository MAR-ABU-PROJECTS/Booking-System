import FeaturedPage from "@/components/FeaturedPage";
import FeaturedProperties from "@/components/FeaturedProperties";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div>
      <Navigation />
      <Header />
      <FeaturedPage />
      <FeaturedProperties />
      <Footer />
    </div>
  );
}
