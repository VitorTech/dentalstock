import { NextResponse } from "next/server";
import { route } from "@/server/http/route";

export const GET = route("public", async () => NextResponse.json({ status: "ok" }));
