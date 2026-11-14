import { connection } from "next/server";
import { listProviders } from "@/lib/llm/config";

export async function GET() {
  await connection();
  return Response.json(listProviders(), { headers: { "Cache-Control": "no-store" } });
}