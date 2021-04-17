const hre = require('hardhat');
const chai = require('chai');
const ethers = require('ethers');
const { solidity, deployMockContract, deployContract, MockProvider } = require('ethereum-waffle');
chai.use(solidity);
const { expect } = chai;
const MockInvABI = require("../../artifacts/contracts/test/MockInv.sol/MockInv.json");
const MockOracleFeedABI = require("../../artifacts/contracts/test/OracleFeed.sol/OracleFeed.json");
const MockXInvABI = require("../../artifacts/contracts/XINV.sol/XINV.json");
const ComptrollerABI = require("../../artifacts/contracts/Comptroller.sol/Comptroller.json");
const UnitrollerABI = require("../../artifacts/contracts/Unitroller.sol/Unitroller.json");

describe('xINV', function() {
    let mockInv;
    let mockXInv;
    let Contract;
    let Comptroller;
    let Unitroller;
    let contractAsUser;
    let contractAsAdmin;
    //const waffle = hre.waffle;
    //const provider = waffle.provider;
    //const [ deployer, admin, wallet1, wallet2 ] = provider.getWallets();
    const [ deployer, admin, wallet1, wallet2 ] = new MockProvider().getWallets();

    beforeEach( async () => {
        // mock INV ERC20 contract, mint tokens (ensure only owner) and check supply
        mockInv = await deployContract(deployer, MockInvABI);
        
        expect(mockInv.address).to.be.properAddress;
        expect(await mockInv.totalSupply()).to.be.equal('0x00');
        expect(await mockInv.balanceOf(deployer.address)).to.be.equal('0x00');

        // mint some INV before sanity check
        await mockInv.mint(deployer.address, ethers.utils.parseEther("1000"));
        
        // comptroller and support market
        Comptroller = await deployContract(deployer, ComptrollerABI);
        Unitroller = await deployContract(deployer, UnitrollerABI);
        await expect(Unitroller._setPendingImplementation(Comptroller.address))
                        .to.emit(Unitroller, "NewPendingImplementation");
        await Comptroller._become(Unitroller.address);
        //const mergedUnitroller = mergeInterface(Unitroller, Comptroller);
        //Comptroller.address = Unitroller.address;

        const name = "XINV";
        const symbol = "XINV";
        const decimals = 18;
        Contract = await deployContract(
            deployer, 
            MockXInvABI, 
            [mockInv.address, Unitroller.address, name, symbol, 
                decimals, admin.address]);
        //expect(await Contract.name).to.be.equal(name);
        contractAsAdmin = Contract.connect(admin);
        //const oldComptroller = await Contract.comptroller.call();
        //console.log(oldComptroller);
        await expect(contractAsAdmin._setComptroller(Unitroller.address)).
                        to.emit(contractAsAdmin, "NewComptroller");
        contractAsUser = Contract.connect(wallet1);
        //console.log(await contractAsAdmin.comptroller.call());
        //await expect(Comptroller._supportMarket(Contract.address))
        //                .to.emit(Comptroller, "MarketListed")
        //                .withArgs(Contract.address);
    })

    describe('INV ERC20', function() {
        it('should only be minted by owner or operator', async () => {
            //
            const amount = ethers.utils.parseEther("200");
            const bal = await mockInv.balanceOf(deployer.address);
            await mockInv.mint(deployer.address, amount);
            
            expect(await mockInv.totalSupply()).to.be.equal(bal.add(amount));
            expect(await mockInv.balanceOf(deployer.address)).to.be.equal(bal.add(amount));

            // non owner or operator attempt
            const inverseTokenAsUser = mockInv.connect(wallet1);
            await expect(inverseTokenAsUser.mint(wallet1.address, amount)).to.be.revertedWith("ONLY MINTERS OR OPERATOR");
        });
    });

    describe('XINV', function() {
        it('should only be minted if user has equal or more amount of INV', async () => {
            const amount = ethers.utils.parseEther("200");
            await mockInv.mint(wallet1.address, amount);

            // fails when wallet 1 tries to mint 220 XINV
            //const bal = await Contract.totalSupply()
            //console.log(bal)
            const toMint = ethers.utils.parseEther("100")
            await contractAsUser.mint(toMint);
            //const bal = await Contract.balanceOf(wallet1.address);
            //console.log(bal);
            //expect(await contractAsUser.balanceOf(wallet1.address)).to.be.equal(toMint);
            
        });
    });
});

function mergeInterface(into, from) {
    const key = (item) => item.inputs ? `${item.name}/${item.inputs.length}` : item.name;
    const existing = into.options.jsonInterface.reduce((acc, item) => {
      acc[key(item)] = true;
      return acc;
    }, {});
    const extended = from.options.jsonInterface.reduce((acc, item) => {
      if (!(key(item) in existing))
        acc.push(item)
      return acc;
    }, into.options.jsonInterface.slice());
    into.options.jsonInterface = into.options.jsonInterface.concat(from.options.jsonInterface);
    return into;
}