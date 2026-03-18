import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurante_id: string }> }
) {
  // Await the params object in Next.js 15+
  const resolvedParams = await params;
  const restauranteId = resolvedParams.restaurante_id;

  if (!restauranteId) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fetch basic restaurant data, fallback if not found
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", restauranteId)
    .single();

  const name = restaurant?.name || "TapTable Hub";
  const shortName = name.length > 12 ? name.substring(0, 12) : name;

  const manifest = {
    name: `${name} | Pedidos Online`,
    short_name: shortName,
    description: `Faça o seu pedido no ${name} facilmente.`,
    start_url: `/p/${restauranteId}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  return NextResponse.json(manifest);
}
