export type ProductRequest = {
  title: string;
  description: string;
  price: number;
  count: number;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
}

export type ProductResponse = Product & {
  count: number;
}
