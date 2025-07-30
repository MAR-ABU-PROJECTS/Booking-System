import { properties } from "./mockData";


const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 500));
export const getAllProperties = async () => {
  await delay(500);
  return properties;
};

export const getPropertyById = async (id: number) => {
  await delay(4000);
  return properties.find((item) => item.id === id);
};