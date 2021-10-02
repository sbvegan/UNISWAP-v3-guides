import { ethers } from "ethers";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";

// connect to local node
const pathToIPC = "/home/soyboy/.ethereum/geth.ipc";
const provider = new ethers.providers.IpcProvider(pathToIPC);

// create Contract object
const poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
);

// creating interfaces (i think this is a typescript thing, 
// I'm not familiar with but it seems to be representing
// the pool)

interface Immutables {
    factory: string;
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    maxLiquidityPerTick: ethers.BigNumber;
}

interface State {
    liquidity: ethers.BigNumber;
    sqrtPriceX96: ethers.BigNumber;
    tick: number;
    observationIndex: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    feeProtocol: number;
    unlocked: boolean;
}

// fetching immutable data from the deployed V3 pool contract
// and return it to create a model of the pool.
async function getPoolImmutables() {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = 
        await Promise.all([
            poolContract.factory(),
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.tickSpacing(),
            poolContract.maxLiquidityPerTick(),
        ]);

    const immutables: Immutables = {
        factory,
        token0,
        token1,
        fee,
        tickSpacing,
        maxLiquidityPerTick
    };

    return immutables;
}

// fetching state data. NOte: the Promise.all style queries the data
// concurently, rather than sequentially.
async function getPoolState() {
    const [liquidity, slot] = await Promise.all([
        poolContract.liquidity(),
        poolContract.slot0(),
    ]);

    const PoolState: State = {
        liquidity,
        sqrtPriceX96: slot[0],
        tick: slot[1],
        observationIndex: slot[2],
        observationCardinality: slot[3],
        observationCardinalityNext: slot[4],
        feeProtocol: slot[5],
        unlocked: slot[6],
    };

    return PoolState;
}

// creating the pool instance
async function main() {
    const [immutables, state] = await Promise.all([
        getPoolImmutables(),
        getPoolState(),
    ]);

    const TokenA = new Token(3, immutables.token0, 6, "USCD", "USD Coin");
    const TokenB = new Token(3, immutables.token1, 18, "WETH", "Wrapped Ether");

    const poolExample = new Pool(
        TokenA,
        TokenB,
        immutables.fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    );
    console.log(poolExample)
}

main();
