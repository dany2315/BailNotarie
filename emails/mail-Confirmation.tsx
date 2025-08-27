import { Button, Html, Tailwind } from "@react-email/components";
import * as React from "react";

export default function MailConfirmation() {
  return (
    <Html>
      <Tailwind>
      <Button
        href="https://bailnotarie.fr"
        style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
        className="bg-black text-white p-4 rounded-2xl"
      >
          Retour à la page d'accueil
      </Button>

      </Tailwind>
    </Html>
  );
}