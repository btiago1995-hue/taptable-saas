import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';

export async function generateMetadata({ params }: { params: Promise<{ restaurante_id: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const restauranteId = resolvedParams.restaurante_id;

    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restauranteId)
        .single();

    const name = restaurant?.name || "TapTable Hub";

    return {
        title: `${name} | Pedidos Online`,
        description: `Cardápio digital e pedidos online para ${name}.`,
        // Overrides the global manifest to use the dynamic one we created
        manifest: `/p/${restauranteId}/manifest.json`,
        appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: name,
        },
    };
}

export default function RestaurantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* The individual restaurante pages are rendered inside this fragment */}
            {children}
        </>
    );
}
