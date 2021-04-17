const { expect } = require("chai");
const hre = require("hardhat");

describe("xINV Test", () => {
    const wallets = {};

    let INVArtifact;
    let OracleFeedArtifact;
    let CERC20ImmutableArtifact;
    let XINVArtifact;
    let JumpRateModelV2Artifact;
    let ComptrollerArtifact;
    let UnitrollerArtifact;

    let inv;
    let xINV;
    let comptroller;
    let unitroller;
    let jumpRateModelV2;

    before(async () => {
        INVArtifact = await hre.artifacts.readArtifact('MockInv'); //await hre.artifacts.readArtifact('INV');
        OracleFeedArtifact = await hre.artifacts.readArtifact('OracleFeed');
        XINVArtifact = await hre.artifacts.readArtifact('MockXInv'); //await hre.artifacts.readArtifact('XINV');
        CERC20ImmutableArtifact = await hre.artifacts.readArtifact('CErc20Immutable');
        JumpRateModelV2Artifact = await hre.artifacts.readArtifact('JumpRateModelV2');
        ComptrollerArtifact = await hre.artifacts.readArtifact('Comptroller');
        UnitrollerArtifact = await hre.artifacts.readArtifact('Unitroller');

        const signers = await hre.ethers.getSigners();

        wallets.admin = signers[0];
        wallets.deployer = signers[1];
        //console.log(XINVArtifact);
    });

    beforeEach(async () => {
        //inv = await hre.waffle.deployContract(wallets.deployer, INVArtifact, [wallets.deployer.address]);
        inv = await hre.waffle.deployContract(wallets.deployer, INVArtifact, []);
        console.log("was here")
        comptroller = await hre.waffle.deployContract(wallets.deployer, ComptrollerArtifact, []);
        unitroller = await hre.waffle.deployContract(wallets.deployer, UnitrollerArtifact, []);
        jumpRateModelV2 = await hre.waffle.deployContract(
            wallets.deployer,
            JumpRateModelV2Artifact,
            // Some random numbers taken from one of the deployment scenarios.
            [
                "0",
                "40000000000000000",
                "1500000000000000000",
                "750000000000000000",
                inv.address,
            ],
        );

        await unitroller.connect(wallets.deployer)._setPendingImplementation(comptroller.address);
        await comptroller.connect(wallets.deployer)._become(unitroller.address);

        /*xINV = await hre.waffle.deployContract(
            wallets.deployer,
            CERC20ImmutableArtifact,
            [
                inv.address,
                unitroller.address,
                jumpRateModelV2.address,
                "200000000000000000000000000",
                "xInverse Finance",
                "xINV",
                "18",
                wallets.deployer.address,
            ],
        );*/
        xINV = await hre.waffle.deployContract(
            wallets.deployer,
            XINVArtifact,
            [
                inv.address,
                unitroller.address,
                "xInverse Finance",
                "xINV",
                "18",
                wallets.deployer.address
            ]
        );

        // Ensure INV is transferable in test cases.
        // await inv.connect(wallets.deployer).openTheGates();
    });

    describe('XINV', function() {
        it('should only be minted if user has equal or more amount of INV', async () => {
            const toMint = hre.ethers.utils.parseEther("1")

            // Get the proxied interface by retrieving the Comptroller contract
            // at Unitroller's address.
            const unitrollerProxy = await hre.ethers.getContractAt(
                "Comptroller",
                unitroller.address,
            );

            // successfully support xINV market
            await expect(unitrollerProxy.connect(wallets.deployer)._supportMarket(xINV.address))
                .to.emit(unitrollerProxy, "MarketListed").withArgs(xINV.address);
            
            console.log("supported market");
            // Approve the transfer of collateral and then transfer to mint xINV.
            await expect(inv.connect(wallets.deployer).approve(xINV.address, toMint))
                .to.emit(inv, "Approval").withArgs(wallets.deployer.address, xINV.address, toMint);
            console.log("approved")

            await expect(xINV.connect(wallets.deployer).mintXINV(toMint)).to.emit(xINV, "Mint");

            //const balanceXINV = await xINV.balanceOf(wallets.deployer.address)
            //expect(balanceXINV).to.equal(toMint);
        });
    });
});