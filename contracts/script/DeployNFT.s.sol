// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../TraderNFT.sol";

contract DeployNFT is Script {
    function run() external returns (TraderNFT nft) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("--------------------------------------------");
        console.log("Deployer:", deployer);
        console.log("Network : Base Mainnet");
        console.log("--------------------------------------------");

        vm.startBroadcast(deployerPrivateKey);

        // baseURI: https://agex.app/api/nft/{tierId}/{tokenId}.json
        nft = new TraderNFT("https://agex.app/api/nft/");

        vm.stopBroadcast();

        console.log("--------------------------------------------");
        console.log("TraderNFT deployed!");
        console.log("Contract address:", address(nft));
        console.log("Basescan:", string.concat("https://basescan.org/address/", vm.toString(address(nft))));
        console.log("--------------------------------------------");
    }
}
