import {
  Button,
  Heading,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseTemplate, colors } from "./base";

interface WelcomeProps {
  restaurantName: string;
  managerName:    string;
  plan:           string;
  trialExpiresAt: string;
  panelUrl:       string;
}

export function WelcomeEmail({ restaurantName, managerName, plan, trialExpiresAt, panelUrl }: WelcomeProps) {
  const trialEnd = new Date(trialExpiresAt).toLocaleDateString("pt-PT", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <BaseTemplate preview={`Bem-vindo ao Dineo, ${restaurantName}!`}>

      <Heading style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px", color: colors.slate900 }}>
        Olá, {managerName}! 👋
      </Heading>

      <Text style={{ fontSize: 15, color: colors.slate600, margin: "0 0 24px", lineHeight: 1.6 }}>
        O <strong>{restaurantName}</strong> está pronto para começar no Dineo.
        Tem <strong>30 dias de acesso gratuito</strong> a todas as funcionalidades do plano <strong>{plan}</strong>.
      </Text>

      {/* Trial info box */}
      <Section style={{
        backgroundColor: colors.greenLight,
        border: `1px solid ${colors.greenBorder}`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 28,
      }}>
        <Row>
          <Column><Text style={{ margin: 0, fontSize: 13, color: colors.greenDark }}>Plano trial</Text></Column>
          <Column align="right"><Text style={{ margin: 0, fontWeight: 700, color: colors.greenDark }}>{plan}</Text></Column>
        </Row>
        <Row>
          <Column><Text style={{ margin: 0, fontSize: 13, color: colors.greenDark }}>Trial válido até</Text></Column>
          <Column align="right"><Text style={{ margin: 0, fontWeight: 700, color: colors.greenDark }}>{trialEnd}</Text></Column>
        </Row>
      </Section>

      <Button
        href={panelUrl}
        style={{
          display: "block",
          backgroundColor: colors.green,
          color: colors.white,
          fontWeight: 800,
          fontSize: 15,
          padding: "14px 32px",
          borderRadius: 10,
          textAlign: "center",
          textDecoration: "none",
          letterSpacing: "-0.3px",
          marginBottom: 24,
        }}
      >
        Entrar no Painel →
      </Button>

      <Text style={{ fontSize: 13, color: colors.slate500, margin: 0 }}>
        Precisa de ajuda? Responda a este email ou contacte-nos em{" "}
        <a href="mailto:suporte@dineo.cv" style={{ color: colors.green }}>suporte@dineo.cv</a>.
      </Text>

    </BaseTemplate>
  );
}
