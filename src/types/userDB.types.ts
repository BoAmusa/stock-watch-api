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

export type TimeSeriesResponse = {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange: string;
    exchange_timezone: string;
  };
  values: {
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }[];
  status: "ok" | string;
};

export type BatchItemResponse = {
  status: "success" | "error";
  response?: TimeSeriesResponse;
};

export type TwelveDataBatchResponse = {
  code: number;
  status: string;
  data: {
    [key: string]: BatchItemResponse;
  };
};
