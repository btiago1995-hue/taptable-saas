import {
  Body,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export const colors = {
  green:      "#16a34a",
  greenLight: "#f0fdf4",
  greenBorder:"#bbf7d0",
  greenDark:  "#166534",
  blue:       "#1d4ed8",
  blueLight:  "#eff6ff",
  blueBorder: "#bfdbfe",
  amber:      "#b45309",
  amberLight: "#fffbeb",
  amberBorder:"#fde68a",
  orange:     "#c2410c",
  orangeLight:"#fff7ed",
  orangeBorder:"#fed7aa",
  red:        "#dc2626",
  redLight:   "#fef2f2",
  redBorder:  "#fecaca",
  slate50:    "#f8fafc",
  slate100:   "#f1f5f9",
  slate400:   "#94a3b8",
  slate500:   "#64748b",
  slate600:   "#475569",
  slate700:   "#334155",
  slate900:   "#0f172a",
  white:      "#ffffff",
};

interface BaseProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseTemplate({ preview, children }: BaseProps) {
  return (
    <Html lang="pt">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", margin: 0, padding: 0, fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>

          {/* Header */}
          <Section style={{ marginBottom: 24 }}>
            <Text style={{
              margin: 0,
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: "-0.5px",
              color: colors.slate900,
            }}>
              Dineo
            </Text>
          </Section>

          {/* Card */}
          <Section style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: "32px 28px",
            border: `1px solid ${colors.slate100}`,
            marginBottom: 16,
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: colors.slate100, margin: "0 0 16px" }} />
          <Text style={{ fontSize: 12, color: colors.slate400, textAlign: "center", margin: 0 }}>
            Dineo · Plataforma de Gestão para Restaurantes
            <br />
            Cabo Verde
            <br />
            <a href="mailto:suporte@dineo.cv" style={{ color: colors.slate400 }}>suporte@dineo.cv</a>
          </Text>

        </Container>
      </Body>
    </Html>
  );
}
