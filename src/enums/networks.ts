const NETWORKS = {
  9: "Mock",
};

export const NETWORK_ID_BY_NAME = Object.fromEntries(
  Object.entries(NETWORKS).map(([k, v]) => [v, Number(k)])
);

export default NETWORKS;
