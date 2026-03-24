import { ContactConfirmationEmail } from "../src/lib/email-templates/contact-confirmation";

export default function Preview() {
  return ContactConfirmationEmail({
    name:         "Maria Fonseca",
    businessName: "Café Mindelo",
  });
}
