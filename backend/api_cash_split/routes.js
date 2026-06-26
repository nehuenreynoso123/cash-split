import statusNetwork from "./components/status/network";
import inversionNetwork from "./components/cajaInversion/network";
import gastosNetwork from "./components/cajaGastosOperativos/network";
import deudoresNetwork from "./components/deudores/network";
import reposicionStockNetwork from "./components/cajaReposicionStock/network";
import ventasNetwork from "./components/ventas/network";
import productosNetwork from "./components/productos/network";
import totalCajasNetwork from "./components/dashboard/network";
import authNetwork from "./components/auth/network";

export default (server) => {
  server.use("/api", statusNetwork);
  server.use("/api", inversionNetwork);
  server.use("/api", gastosNetwork);
  server.use("/api", deudoresNetwork);
  server.use("/api", reposicionStockNetwork);
  server.use("/api", ventasNetwork);
  server.use("/api", productosNetwork);
  server.use("/api", totalCajasNetwork);
  server.use("/api", authNetwork);
};
