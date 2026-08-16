import statusNetwork from "./components/status/network.js";
import liquidezNetwork from "./components/liquidez/network.js";
import gastosNetwork from "./components/cajaGastosOperativos/network.js";
import deudoresNetwork from "./components/deudores/network.js";
import ventasNetwork from "./components/ventas/network.js";
import facturacionNetwork from "./components/facturacion/network.js";
import productosNetwork from "./components/productos/network.js";
import totalCajasNetwork from "./components/dashboard/network.js";
import flujoFondosNetwork from "./components/flujoFondos/network.js";
import authNetwork from "./components/auth/network.js";
import lumixClientesNetwork from "./components/lumixClientes/network.js";
import settingsNetwork from "./components/settings/network.js";

export default (server) => {
  server.use("/api", statusNetwork);
  server.use("/api", liquidezNetwork);
  server.use("/api", gastosNetwork);
  server.use("/api", deudoresNetwork);
  server.use("/api", ventasNetwork);
  server.use("/api", facturacionNetwork);
  server.use("/api", productosNetwork);
  server.use("/api", totalCajasNetwork);
  server.use("/api", flujoFondosNetwork);
  server.use("/api", authNetwork);
  server.use("/api", lumixClientesNetwork);
  server.use("/api", settingsNetwork);
};
