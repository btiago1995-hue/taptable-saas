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

interface TrialWarningProps {
  restaurantName: string;
  daysLeft:       number;
  plan:           string;
  amount:         number;
  expiresAt:      string;
  upgradeUrl:     string;
}

const config: Record<number, { bg: string; border: string; text: string; label: string; btnColor: string }> = {
  7: { bg: colors.blueLight,   border: colors.blueBorder,   text: colors.blue,   label: "7 dias restantes",  btnColor: colors.green },
  3: { bg: colors.amberLight,  border: colors.amberBorder,  text: colors.amber,  label: "Apenas 3 dias!",    btnColor: colors.green },
  1: { bg: colors.orangeLight, border: colors.orangeBorder, text: colors.orange, label: "Último dia!",       btnColor: colors.orange },
  0: { bg: colors.redLight,    border: colors.redBorder,    text: colors.red,    label: "Trial expirado",    btnColor: colors.red },
};

const subjects: Record<number, string> = {
  7: "O seu trial termina em 7 dias — escolha o seu plano",
  3: "Apenas 3 dias para não perder o acesso ao Dineo",
  1: "Último dia! Garanta o seu plano ainda hoje",
  0: "O seu período de teste terminou",
};

export function TrialWarningEmail({ restaurantName, daysLeft, plan, amount, expiresAt, upgradeUrl }: TrialWarningProps) {
  const c       = config[daysLeft] ?? config[0];
  const subject = subjects[daysLeft] ?? subjects[0];
  const expDate = new Date(expiresAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

  const bodyText = daysLeft === 0
    ? `O período de teste de ${restaurantName} terminou hoje. Subscreva agora para manter o acesso a todos os seus dados e funcionalidades.`
    : `O período de teste de ${restaurantName} termina em ${daysLeft} dia${daysLeft > 1 ? "s" : ""} (${expDate}). Após essa data, o acesso ao painel será suspenso.`;

  return (
    <BaseTemplate preview={subject}>

      {/* Alert badge */}
      <Section style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
      }}>
        <Text style={{ margin: 0, fontWeight: 900, fontSize: 15, color: c.text }}>{c.label}</Text>
      </Section>

      <Heading style={{ fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.4px", color: colors.slate900 }}>
        {subject}
      </Heading>

      <Text style={{ fontSize: 14, color: colors.slate600, margin: "0 0 20px", lineHeight: 1.6 }}>
        {bodyText}
      </Text>

      {/* Plan info */}
      <Section style={{
        backgroundColor: colors.slate50,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
      }}>
        <Row>
          <Column><Text style={{ margin: 0, fontSize: 13, color: colors.slate500 }}>Plano actual</Text></Column>
        </Row>
        <Row>
          <Column>
            <Text style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 17, color: colors.slate900 }}>
              {plan} · {amount.toLocaleString("pt-PT")} CVE/mês
            </Text>
          </Column>
        </Row>
      </Section>

      <Button
        href={upgradeUrl}
        style={{
          display: "block",
          backgroundColor: c.btnColor,
          color: colors.white,
          fontWeight: 800,
          fontSize: 15,
          padding: "14px 32px",
          borderRadius: 10,
          textAlign: "center",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        {daysLeft === 0 ? "Reactivar agora →" : "Escolher plano →"}
      </Button>

      <Text style={{ fontSize: 12, color: colors.slate400, textAlign: "center", margin: 0 }}>
        Questões?{" "}
        <a href="mailto:suporte@dineo.cv" style={{ color: colors.slate500 }}>suporte@dineo.cv</a>
      </Text>

    </BaseTemplate>
  );
}
