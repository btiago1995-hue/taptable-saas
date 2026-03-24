import { ContactInternalEmail } from "../src/lib/email-templates/contact-internal";

export default function Preview() {
  return ContactInternalEmail({
    name:         "Maria Fonseca",
    email:        "maria@cafemindelo.cv",
    phone:        "+238 991 2345",
    businessName: "Café Mindelo",
    numLocations: 3,
    message:      "Tenho 3 espaços em São Vicente e preciso de uma solução integrada.",
  });
}
