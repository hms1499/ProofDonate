// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ProofDonateV2.sol";

contract DeployProofDonateV2 is Script {
    // cUSD on Celo mainnet
    address constant CUSD = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    uint256 constant FEE_BPS = 200; // 2%
    uint256 constant MIN_DONATION = 0.2 ether; // 0.2 cUSD (18 decimals)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ProofDonateV2 proofDonate = new ProofDonateV2(CUSD, FEE_BPS, MIN_DONATION);

        vm.stopBroadcast();

        console.log("ProofDonateV2 deployed at:", address(proofDonate));
        console.log("Donation token:", address(proofDonate.donationToken()));
        console.log("Owner:", proofDonate.owner());
    }
}
