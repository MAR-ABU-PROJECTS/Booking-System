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
      <section className="relative min-h-screen bg-center bg-no-repeat bg-[url('/banner/indoor.jpg')] bg-cover ">
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-black/30"></div>

        {/* Content container */}
        <div className="relative z-10 px-4 mx-auto max-w-7xl text-center py-20">
          {/* Main heading */}
          <div className="flex flex-col items-center pt-5">
            <h1 className="text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-tight mb-6 gilda-display">
              Premium Accommodations
              <span className="block">
                Across Nigeria
              </span>
            </h1>

            <p className="text-white/90 text-base md:text-lg lg:text-xl font-light max-w-3xl mx-auto mb-8 md:mb-12 lg:mb-16 leading-relaxed">
              Discover luxury apartments, executive short lets, and premium
              buildings in Nigeria's most prestigious locations
            </p>

            {/* Stats */}
            <div className="w-full">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 lg:gap-12 py-6 md:py-8 px-6 md:px-10 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl max-w-5xl mx-auto">
                {homeCard.map((card, index) => (
                  <div
                    key={index}
                    className="flex flex-col justify-center items-center"
                  >
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{card.no}+</h3>
                    <p className="text-xs md:text-sm lg:text-base font-medium text-gray-600 text-center">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </section>
    </>
  );
};

export default Header;
