import { INITIAL_MENU_ITEMS as seedItems, INITIAL_CATEGORIES as seedCategories } from './catalogSeed';
export * from './catalogSeed';
const assetBase = import.meta.env.BASE_URL || '/';
const img = (file: string): string => assetBase + 'src/assets/images/' + file;
export const BRAND_LOGO = assetBase + 'assets/logo-elqalyouby.png';
export const HERO_IMAGE = img('hero_pizza_commercial_1795366680097.jpg');
const photoFiles = {
  "pizzaChicken": "dish_it_chicken_1795366680193.jpg",
  "pizzaSausage": "dish_it_sausage_1795366679639.jpg",
  "pizzaMargherita": "dish_it_margherita_1795366680414.jpg",
  "pizzaCheeseLovers": "dish_it_cheese_lovers_1795366679513.jpg",
  "pizzaSeafood": "dish_it_seafood_1795366679412.jpg",
  "hawawshiItalian": "dish_it_hawawshi_1795366680503.jpg",
  "pizzaOrientalSupreme": "dish_or_supreme_1795366770103.jpg",
  "feteerChicken": "dish_feteer_chicken_1795366770538.jpg",
  "feteerMeshaltet": "dish_feteer_meshaltet_1795366681128.jpg",
  "feteerMozzarella": "dish_feteer_cheese_pie_1795366679931.jpg",
  "feteerSweetNuts": "dish_feteer_sweet_nuts_1795366770359.jpg",
  "feteerLotus": "dish_feteer_lotus_1795366770617.jpg",
  "crepeSausage": "dish_crepe_sausage_1795366770113.jpg",
  "crepeChickenShawarma": "dish_crepe_chicken_shawarma_1795366679998.jpg",
  "saroukhMixMeat": "dish_saroukh_mix_meat_1795366771020.jpg",
  "pizzaBbqRanchChicken": "dish_it_2_bbq_ranch_chicken_1795370660289.webp",
  "pizzaMixChicken": "dish_it_4_mix_chicken_1795370684251.webp",
  "pizzaStripsRanchBbq": "dish_it_5_strips_ranch_bbq_1795370687029.webp",
  "pizzaSausageFingers": "dish_it_6_sausage_fingers_1795370684564.webp",
  "pizzaAlexandrianSausage": "dish_it_9_alexandrian_sausage_1795370684521.webp",
  "pizzaMincedBeef": "dish_it_13_minced_beef_1795370685694.webp"
};
export const DISH_IMAGES = Object.fromEntries(Object.entries(photoFiles).map(([k,v])=>[k,img(v)])) as Record<keyof typeof photoFiles,string>;
const itemPhotoKeys: Record<string,keyof typeof photoFiles> = {
  "ip-1": "pizzaChicken",
  "ip-2": "pizzaBbqRanchChicken",
  "ip-4": "pizzaMixChicken",
  "ip-5": "pizzaStripsRanchBbq",
  "ip-6": "pizzaSausageFingers",
  "ip-7": "pizzaMargherita",
  "ip-8": "pizzaCheeseLovers",
  "ip-9": "pizzaAlexandrianSausage",
  "ip-11": "pizzaSausage",
  "ip-13": "pizzaMincedBeef",
  "ip-21": "pizzaSeafood",
  "ip-23": "hawawshiItalian",
  "ep-18": "pizzaOrientalSupreme",
  "sp-1": "feteerChicken",
  "mp-1": "feteerMeshaltet",
  "scp-4": "feteerMozzarella",
  "swp-12": "feteerSweetNuts",
  "swp-18": "feteerLotus",
  "mc-4": "crepeSausage",
  "cc-7": "crepeChickenShawarma",
  "sr-9": "saroukhMixMeat"
};
export const INITIAL_MENU_ITEMS = seedItems.map(item => ({
  ...item,
  image: itemPhotoKeys[item.id]
    ? DISH_IMAGES[itemPhotoKeys[item.id]]
    : assetBase + 'assets/menu/' + item.id + '.webp',
}));
const categoryPhotoKeys = ["pizzaMargherita","pizzaOrientalSupreme","feteerChicken","feteerMozzarella","feteerLotus","crepeChickenShawarma","feteerMozzarella","feteerSweetNuts","saroukhMixMeat","pizzaCheeseLovers"];
export const INITIAL_CATEGORIES = seedCategories.map((cat,i) => ({
  ...cat, image: DISH_IMAGES[categoryPhotoKeys[i] as keyof typeof photoFiles] || HERO_IMAGE,
}));
export const IMAGE_PRESET_OPTIONS = Object.entries(DISH_IMAGES).map(([key,value])=>({label:key,value}));
