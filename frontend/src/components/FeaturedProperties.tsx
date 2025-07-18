import PropertiesCard from "./PropertiesCard";

const FeaturedProperties = () => {
  return (
    <>
      <div className="relative bg-gradient-to-b from-gray-50 to-white pt-20 pb-16">
        {/* Header Section */}
        <div className="text-center mb-16 px-4 mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 gilda-display">
            Featured Properties
          </h2>
          <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
            Discover our carefully curated collection of premium accommodations
            across Nigeria's most prestigious locations
          </p>
        </div>
        
        {/* Properties Grid */}
        <div className="px-4 mx-auto max-w-7xl">
          <PropertiesCard />
        </div>
      </div>
    </>
  );
};

export default FeaturedProperties;
