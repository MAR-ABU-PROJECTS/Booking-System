import AirbnbStyleNavigation from "@/components/AirbnbStyleNavigation";
import AirbnbStyleSearch from "@/components/AirbnbStyleSearch";
import CategoryFilters from "@/components/CategoryFilters";
import MarAbuPropertyTypes from "@/components/MarAbuPropertyTypes";
import PropertyImageShowcase from "@/components/PropertyImageShowcase";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      <AirbnbStyleNavigation />
      <Header />
      <AirbnbStyleSearch />
      <CategoryFilters />
      <MarAbuPropertyTypes />
      <PropertyImageShowcase />
      <Footer />
    </div>
  );
}
