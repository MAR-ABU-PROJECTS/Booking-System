import AvailabilitySearch from "@/components/AvailabilitySearch";
import FeaturedProperties from "@/components/FeaturedProperties";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div>
      <Navigation />
      <Header />
      <AvailabilitySearch />
      <FeaturedProperties />
      <Footer />
    </div>
  );
}
