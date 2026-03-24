import { TrialWarningEmail } from "../src/lib/email-templates/trial-warning";

export default function Preview() {
  return TrialWarningEmail({
    restaurantName: "Restaurante Tropical",
    daysLeft:       7,
    plan:           "Growth",
    amount:         8500,
    expiresAt:      new Date(Date.now() + 7 * 86400000).toISOString(),
    upgradeUrl:     "https://dineo.cv/admin/upgrade",
  });
}
