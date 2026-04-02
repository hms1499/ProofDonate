// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ProofDonate.sol";

contract DeployProofDonate is Script {
    function run() external {
        // cUSD address on Celo mainnet
        address cUSD_MAINNET = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
        // cUSD address on Celo Sepolia testnet
        address cUSD_SEPOLIA = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

        // Use Sepolia by default, override with env var for mainnet
        address cUSD = block.chainid == 42220 ? cUSD_MAINNET : cUSD_SEPOLIA;

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ProofDonate proofDonate = new ProofDonate(cUSD);

        vm.stopBroadcast();

        console.log("ProofDonate deployed at:", address(proofDonate));
        console.log("cUSD address:", cUSD);
        console.log("Owner:", proofDonate.owner());
    }
}
