// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ProofDonate.sol";

contract DeployProofDonate is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ProofDonate proofDonate = new ProofDonate(200); // 2% platform fee

        vm.stopBroadcast();

        console.log("ProofDonate deployed at:", address(proofDonate));
        console.log("Owner:", proofDonate.owner());
    }
}
