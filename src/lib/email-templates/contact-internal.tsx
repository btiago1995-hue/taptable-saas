import {
  Heading,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseTemplate, colors } from "./base";

interface ContactInternalProps {
  name:         string;
  email:        string;
  phone?:       string | null;
  businessName: string;
  numLocations: number;
  message?:     string | null;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ borderBottom: `1px solid ${colors.slate100}` }}>
      <Column style={{ padding: "10px 14px", width: 140 }}>
        <Text style={{ margin: 0, fontSize: 13, color: colors.slate500 }}>{label}</Text>
      </Column>
      <Column style={{ padding: "10px 14px" }}>
        <Text style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.slate900 }}>{value}</Text>
      </Column>
    </Row>
  );
}

export function ContactInternalEmail({ name, email, phone, businessName, numLocations, message }: ContactInternalProps) {
  return (
    <BaseTemplate preview={`Novo Lead PRO — ${businessName}`}>

      <Heading style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.4px", color: colors.slate900 }}>
        Novo pedido de contacto PRO 🔔
      </Heading>

      <Section style={{
        backgroundColor: colors.slate50,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 24,
        border: `1px solid ${colors.slate100}`,
      }}>
        <DataRow label="Nome"          value={name} />
        <DataRow label="Email"         value={email} />
        <DataRow label="Telefone"      value={phone || "—"} />
        <DataRow label="Negócio"       value={businessName} />
        <DataRow label="Localizações"  value={String(numLocations)} />
        {message && <DataRow label="Mensagem" value={message} />}
      </Section>

      <Text style={{ fontSize: 12, color: colors.slate400, margin: 0 }}>
        Recebido em {new Date().toLocaleString("pt-PT")}
      </Text>

    </BaseTemplate>
  );
}
