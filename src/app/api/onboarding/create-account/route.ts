import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { name, email, password, restaurantName, plan } = await req.json();

        if (!name || !email || !password || !restaurantName || !plan) {
            return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 });
        }

        // 1. Criar utilizador via Admin API — sem email de confirmação
        //    email_confirm: true cria o utilizador já confirmado
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // ← ignora rate limit de email de confirmação
            user_metadata: { name }
        });

        if (authError) {
            // Mensagem amigável para email já em uso
            if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
                return NextResponse.json({ error: 'Este e-mail já está registado. Tente fazer login.' }, { status: 409 });
            }
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. Criar o restaurante (tenant isolado) com 30 dias de trial
        const trialExpiresAt = new Date();
        trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

        const { data: restData, error: restErr } = await supabaseAdmin
            .from('restaurants')
            .insert([{
                name: restaurantName,
                subscription_plan: plan,
                is_active: true,
                subscription_started_at: new Date().toISOString(),
                subscription_expires_at: trialExpiresAt.toISOString(),
                subscription_billing: 'monthly'
            }])
            .select('id')
            .single();

        if (restErr) {
            // Rollback: apagar o utilizador criado
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: 'Erro ao criar restaurante: ' + restErr.message }, { status: 500 });
        }

        // 3. Criar perfil do utilizador ligado ao restaurante correto
        const { error: profileErr } = await supabaseAdmin
            .from('users')
            .insert([{
                id: userId,
                restaurant_id: restData.id,
                name,
                role: 'manager',
                access_modules: ['dashboard', 'cashier', 'kitchen', 'waiter', 'menu', 'customers', 'driver']
            }]);

        if (profileErr) {
            // Rollback: apagar utilizador e restaurante
            await supabaseAdmin.auth.admin.deleteUser(userId);
            await supabaseAdmin.from('restaurants').delete().eq('id', restData.id);
            return NextResponse.json({ error: 'Erro ao criar perfil: ' + profileErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, restaurantId: restData.id });

    } catch (err: any) {
        console.error('[onboarding/create-account] Erro:', err);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
