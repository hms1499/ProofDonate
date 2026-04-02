import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
const CUSD_SEPOLIA = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

const ProofDonateModule = buildModule("ProofDonateModule", (m) => {
  const cUSDAddress = m.getParameter("cUSDAddress", CUSD_MAINNET);
  const proofDonate = m.contract("ProofDonate", [cUSDAddress]);
  return { proofDonate };
});

export default ProofDonateModule;
