import {
  Heading,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseTemplate, colors } from "./base";

interface ContactConfirmationProps {
  name:         string;
  businessName: string;
}

export function ContactConfirmationEmail({ name, businessName }: ContactConfirmationProps) {
  return (
    <BaseTemplate preview={`Recebemos o seu contacto, ${name}`}>

      <Heading style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.4px", color: colors.slate900 }}>
        Recebemos o seu pedido
      </Heading>

      <Text style={{ fontSize: 14, color: colors.slate600, margin: "0 0 20px", lineHeight: 1.6 }}>
        Olá <strong>{name}</strong>, recebemos o seu interesse no Dineo para <strong>{businessName}</strong>.
      </Text>

      <Section style={{
        backgroundColor: colors.greenLight,
        border: `1px solid ${colors.greenBorder}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
      }}>
        <Text style={{ margin: 0, fontSize: 14, color: colors.greenDark, lineHeight: 1.6 }}>
          A nossa equipa irá entrar em contacto consigo nas próximas{" "}
          <strong>24 horas</strong> para apresentar a proposta adequada ao seu negócio.
        </Text>
      </Section>

      <Text style={{ fontSize: 13, color: colors.slate500, margin: 0 }}>
        Questão urgente? Contacte-nos directamente em{" "}
        <a href="mailto:comercial@dineo.cv" style={{ color: colors.green }}>comercial@dineo.cv</a>.
      </Text>

    </BaseTemplate>
  );
}
