// Pre-seeded tutorial data for "The Bones" band
export const TUTORIAL_SEED_DATA = {
  sheetId: "TUTORIAL_THE_BONES",
  sheetName: "The Bones - Merch Table",
  products: [
    {
      id: "tutorial-1",
      name: "Spiked Collar",
      price: 20,
      quantity: 12,
      category: "Accessories",
      imageUrl: "/the-bones-spiked-collar.png",
      inventory: { default: 12 },
    },
    {
      id: "tutorial-2",
      name: "Live at The Garage (Vinyl)",
      price: 30,
      quantity: 8,
      category: "Music",
      imageUrl: "/the-bones-record.png",
      inventory: { default: 8 },
    },
    {
      id: "tutorial-3",
      name: "The Bones Bandana",
      price: 15,
      quantity: 20,
      category: "Accessories",
      imageUrl: "/the-bones-bandana.png",
      inventory: { default: 20 },
    },
  ],
  sales: [],
  settings: {
    venueSplit: 20,
    currency: "USD",
    theme: "default",
  },
};

export const isTutorialMode = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("currentSheetId") === TUTORIAL_SEED_DATA.sheetId;
};

export const enableTutorialMode = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem("currentSheetId", TUTORIAL_SEED_DATA.sheetId);
  // Store tutorial data in localStorage for the session
  localStorage.setItem(
    "tutorial_data",
    JSON.stringify(TUTORIAL_SEED_DATA.products)
  );
};

export const exitTutorialMode = async (keepData: boolean) => {
  if (typeof window === "undefined") return;

  // Always remove tutorial mode flag
  localStorage.removeItem("currentSheetId");
  localStorage.removeItem("tutorial_data");

  if (!keepData) {
    // Clear all tutorial data from IndexedDB
    console.log("Clearing tutorial data - starting fresh");
    const { clearAllData } = await import("./db");
    await clearAllData();
  }
  // If keepData is true, products stay in IndexedDB and will be synced to new sheet
};
