// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {PriceOracle} from "../../src/PriceOracle.sol";
import {MockPyth} from "../mocks/MockPyth.sol";
import {MockChainlinkAggregator} from "../mocks/MockChainlinkAggregator.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {PythStructs} from "../../lib/pyth-sdk-solidity/PythStructs.sol";
import {IPyth} from "../../lib/pyth-sdk-solidity/IPyth.sol";

contract PriceOracleTest is Test {
    receive() external payable {}

    MockPyth pyth;
    MockChainlinkAggregator cl;
    MockERC20 tokenA;
    MockERC20 tokenB;
    PriceOracle oracle;

    bytes32 pidA = keccak256("A");
    bytes32 pidB = keccak256("B");

    function setUp() public {
        pyth = new MockPyth();
        cl = new MockChainlinkAggregator();
        tokenA = new MockERC20("A", "A");
        tokenB = new MockERC20("B", "B");
        oracle = new PriceOracle(address(pyth), address(this));

        int64 px = int64(uint64(100_000_000));
        // conf must be > 0: oracle converts conf with _convertPythPrice which requires positive mantissa
        pyth.setPrice(pidA, px, 1, -8, block.timestamp);
        pyth.setPrice(pidB, px, 1, -8, block.timestamp);
        cl.setAnswer(1e8, block.timestamp);

        oracle.addPriceFeed(address(tokenA), address(0), pidA, 18);
        oracle.addPriceFeed(address(tokenB), address(cl), bytes32(0), 18);
    }

    function test_addPriceFeed_duplicate_reverts() public {
        vm.expectRevert(bytes("feed already registered"));
        oracle.addPriceFeed(address(tokenA), address(cl), pidA, 18);
    }

    function test_updateFeed_rotates() public {
        MockChainlinkAggregator cl2 = new MockChainlinkAggregator();
        cl2.setAnswer(2e8, block.timestamp);
        oracle.updateFeed(address(tokenB), address(cl2), bytes32(0));
        PriceOracle.PriceData memory p = oracle.getLatestPrice(address(tokenB));
        assertEq(p.price, 2e8);
    }

    function test_validateClearingPrice_withinBand() public view {
        oracle.validateClearingPrice(address(tokenA), address(tokenB), 1e18);
    }

    function test_validateClearingPrice_deviation_reverts() public {
        vm.expectRevert();
        oracle.validateClearingPrice(address(tokenA), address(tokenB), 2e18);
    }

    function test_mockPyth_returnsPrice() public view {
        PythStructs.Price memory p = pyth.getPriceUnsafe(pidA);
        assertGt(uint256(int256(p.price)), 0);
        PythStructs.Price memory viaIface = IPyth(address(pyth)).getPriceUnsafe(pidA);
        assertGt(uint256(int256(viaIface.price)), 0);
    }

    function test_oracle_wired_to_mockPyth() public view {
        assertEq(address(oracle.pyth()), address(pyth));
        assertEq(oracle.pythPriceIds(address(tokenA)), pidA);
    }

    function test_getPythPriceUnsafe_view() public view {
        oracle.getPythPriceUnsafe(address(tokenA));
    }

    function test_stalePrice_reverts() public {
        vm.warp(block.timestamp + 4000 days);
        vm.expectRevert();
        oracle.getLatestPrice(address(tokenA));
    }

    function test_updatePythPrice_refunds_excess() public {
        pyth.setUpdateFee(1 wei);
        bytes[] memory data = new bytes[](1);
        data[0] = hex"00";
        vm.deal(bob, 1 ether);
        vm.prank(bob);
        oracle.updatePythPrice{value: 0.1 ether}(data, address(tokenA));
        assertGt(bob.balance, 0.99 ether);
    }

    address bob = makeAddr("bob");
}
