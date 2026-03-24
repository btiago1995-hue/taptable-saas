import { WelcomeEmail } from "../src/lib/email-templates/welcome";

export default function Preview() {
  return WelcomeEmail({
    restaurantName: "Restaurante Tropical",
    managerName:    "João Silva",
    plan:           "Growth",
    trialExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    panelUrl:       "https://dineo.cv/admin",
  });
}
