import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  type: 'match_request' | 'assignment_confirmed' | 'delivery_completed' | 'review_received' | 'verification_approved';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, type }: EmailRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user info for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, email')
      .eq('email', to)
      .single();

    // Template based on type
    let finalHtml = html;
    const firstName = profile?.first_name || 'Utilisateur';

    switch (type) {
      case 'match_request':
        finalHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Nouvelle demande de transport</h2>
            <p>Bonjour ${firstName},</p>
            <p>Vous avez reçu une nouvelle demande de transport pour l'un de vos trajets.</p>
            ${html}
            <p style="margin-top: 20px;">
              <a href="${Deno.env.get("SUPABASE_URL")}/reservations" 
                 style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Voir la demande
              </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </p>
          </div>
        `;
        break;

      case 'assignment_confirmed':
        finalHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Réservation confirmée ✓</h2>
            <p>Félicitations ${firstName} !</p>
            <p>Votre réservation a été confirmée avec succès.</p>
            ${html}
            <p style="margin-top: 20px;">
              <a href="${Deno.env.get("SUPABASE_URL")}/my-shipments" 
                 style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Voir mes réservations
              </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              GP Connect - Votre plateforme de transport de confiance
            </p>
          </div>
        `;
        break;

      case 'delivery_completed':
        finalHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Livraison terminée 📦</h2>
            <p>Bonjour ${firstName},</p>
            <p>Votre colis a été livré avec succès !</p>
            ${html}
            <p style="margin-top: 20px;">
              <a href="${Deno.env.get("SUPABASE_URL")}/tracking" 
                 style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Voir la preuve de livraison
              </a>
            </p>
            <p style="margin-top: 15px; font-size: 14px;">
              N'oubliez pas de laisser un avis sur votre expérience !
            </p>
          </div>
        `;
        break;

      case 'verification_approved':
        finalHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Compte vérifié ✓</h2>
            <p>Félicitations ${firstName} !</p>
            <p>Votre compte a été vérifié avec succès. Vous bénéficiez maintenant de tous les avantages :</p>
            <ul style="line-height: 1.8;">
              <li>Badge de confiance visible par tous</li>
              <li>Meilleure visibilité dans les recherches</li>
              <li>Accès à toutes les fonctionnalités</li>
              <li>Priorité dans les demandes</li>
            </ul>
            <p style="margin-top: 20px;">
              <a href="${Deno.env.get("SUPABASE_URL")}/dashboard" 
                 style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Accéder à mon tableau de bord
              </a>
            </p>
          </div>
        `;
        break;
    }

    console.log(`Email notification prepared for ${to} (${type})`);
    console.log('Note: Configure RESEND_API_KEY to actually send emails');

    // Return success (actual email sending requires Resend configuration)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification logged',
        note: 'To actually send emails, configure RESEND_API_KEY secret'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});