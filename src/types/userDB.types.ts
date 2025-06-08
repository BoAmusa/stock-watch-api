export type StockInfo = {
  symbol: string;
  companyName: string;
  logo: string | null;
  price: number;
  change: number;
  percentChange: number;
  currency: string;
};

export type UserStockDocument = {
  id: string;
  userId: string;
  stock: StockInfo;
};
