import React from "react";

const Header = () => {
  const homeCard = [
    {
      no: 500,
      desc: "Premium Properties",
    },
    {
      no: "15,000",
      desc: "Satisfied Guests",
    },
    {
      no: 25,
      desc: "Prime Locations",
    },
    {
      no: "99%",
      desc: "Guest Satisfaction",
    },
  ];
  return (
    <>
      <section className="relative min-h-screen bg-center bg-no-repeat bg-[url('/banner/sample.jpg')] bg-cover">
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-black/30"></div>
        
        {/* Content container */}
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen px-4 mx-auto max-w-7xl text-center pt-30 pb-32">
          {/* Main heading - larger and more prominent */}
          <h1 className="text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-tight mb-6 gilda-display">
            Premium Accommodations
            <span className="block">
              Across Nigeria
            </span>
          </h1>
          
          {/* Subtext - smaller and more refined */}
          <p className="text-white/90 text-base md:text-lg lg:text-xl font-light max-w-3xl mx-auto mb-16 leading-relaxed">
            Discover luxury apartments, executive short lets, and premium
            buildings in Nigeria's most prestigious locations
          </p>
          
          {/* Stats counter moved lower */}
          <div className="mt-auto mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 py-8 px-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl">
              {homeCard.map((card, index) => (
                <div
                  key={index}
                  className="flex flex-col justify-center items-center"
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{card.no}+</h3>
                  <p className="text-sm md:text-base font-medium text-gray-600">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Header;
