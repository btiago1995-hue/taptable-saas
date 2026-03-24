import { TrialWarningEmail } from "../src/lib/email-templates/trial-warning";

export default function Preview() {
  return TrialWarningEmail({
    restaurantName: "Restaurante Tropical",
    daysLeft:       0,
    plan:           "Growth",
    amount:         8500,
    expiresAt:      new Date().toISOString(),
    upgradeUrl:     "https://dineo.cv/admin/upgrade",
  });
}
