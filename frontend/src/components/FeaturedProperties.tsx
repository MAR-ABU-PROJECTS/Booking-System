import PropertiesCard from "./PropertiesCard";

const FeaturedProperties = () => {
  return (
    <>
      <div className="flex flex-col max-w-screen justify-center items-center bg-white py-[40px] gap-[30px]">
        <div className="flex flex-col justify-center items-center">
          <p className="text-[26px] font-bold">Featured Properties</p>
          <p className="text-[16px] fon-medium text-center capitalize">
            Discover our carefully curated collection of premium accommodations
          </p>
        </div>
        <PropertiesCard />
      </div>
    </>
  );
};

export default FeaturedProperties;
