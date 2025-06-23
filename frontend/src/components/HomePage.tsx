import React from "react";

const HomePage = () => {
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
      <section className="bg-center bg-no-repeat bg-[url('/images/background.jpg')] bg-cover bg-gray-100 bg-blend-multiply">
        <div className="flex-col h-[100%] px-4 mx-auto max-w-screen text-center flex p-[60px] md:pb-[150px] items-center gap-3">
          <h1 className="text-black text-3xl font-extrabold tracking-tight leading-none md:text-5xl lg:text-6xl">
            Premium Accommodations Across{" "}
            <span className="hidden lg:inline">
              <br />
            </span>
            Nigeria
          </h1>
          <p className="mb-8 text-lg font-medium text-gray-800 lg:text-xl sm:px-16 lg:px-48 capitalize">
            Discover luxury apartments, executive short lets, and premium
            buildings in Nigeria&lsquo;s most prestigious locations
          </p>
          <div className="grid grid-flow-col grid-rows-2 md:grid-rows-1 py-[20px] px-[30px] gap-[25px] h-[200px] md:h-[100px] bg-white rounded-xl border-2 border-[#F4A857] shadow-2xl">
            {homeCard.map((card, index) => (
              <div
                key={index}
                className="flex flex-col h-full w-full justify-center items-center"
              >
                <h1 className="text-[24px] font-[700]">{card.no}+</h1>
                <p className="text-[16px] font-[400]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
