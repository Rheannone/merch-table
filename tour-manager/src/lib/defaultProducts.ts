import { Product } from "@/types";

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "band-shirt",
    name: "Band T-Shirt",
    price: 20,
    category: "Apparel",
    description: "Classic tour shirt",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    inventory: {
      XS: 3,
      S: 3,
      M: 3,
      L: 3,
      XL: 3,
      XXL: 3,
    },
  },
  {
    id: "vinyl-record",
    name: "Latest Album (Vinyl)",
    price: 25,
    category: "Music",
    description: "180g vinyl record",
    inventory: {
      default: 3,
    },
  },
  {
    id: "button",
    name: "Band Button",
    price: 3,
    category: "Merch",
    description: "1.5 inch button",
    inventory: {
      default: 3,
    },
  },
];
