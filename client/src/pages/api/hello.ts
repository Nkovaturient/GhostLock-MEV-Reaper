// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  res.status(200).json({ name: "John Doe" });
}

import { NextResponse } from "next/server";

export async function GET() {
  const data = [
    {
      id: "A-1001",
      market: "ETH/USDC",
      clearingPrice: "3120.52",
      intents: 42,
      settlementBlock: 12345678,
      aiPrice: "3118.90",
    },
    {
      id: "A-1000",
      market: "WBTC/USDC",
      clearingPrice: "64123.00",
      intents: 11,
      settlementBlock: 12345500,
      aiPrice: "64100.12",
    },
  ];
  return NextResponse.json(data);
}

