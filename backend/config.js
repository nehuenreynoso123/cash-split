import "dotenv/config";

export default {
  service: {
    api_cash_splice: {
      HOST: process.env.API_HOST ?? "localhost",
      PORT: process.env.API_PORT ?? "3000",
    },
  },
  db: {
    HOST: process.env.DB_HOST ?? "db",
    PORT: process.env.DB_PORT ?? "5432",
    NAME: process.env.DB_NAME ?? "cash_db",
    USER: process.env.DB_USER ?? "user",
    PASSWORD: process.env.DB_PASSWORD ?? "password",
  },
  jwt: {
    SECRET: process.env.JWT_SECRET ?? "cash_split_dev_secret",
  },
};
