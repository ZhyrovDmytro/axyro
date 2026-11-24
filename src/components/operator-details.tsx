import { supportEmail } from "@/lib/publishing";

export function OperatorDetails() {
  const name = process.env.AXYRO_OPERATOR_NAME?.trim();
  const address = process.env.AXYRO_OPERATOR_ADDRESS?.trim();
  const registration = process.env.AXYRO_OPERATOR_REGISTRATION?.trim();
  const phone = process.env.AXYRO_OPERATOR_PHONE?.trim();

  return (
    <section className="instruction-section">
      <h2>Operator and contact</h2>
      <p>{name ? `Axyro is operated by ${name} in the Czech Republic.` : "Axyro is a project based in the Czech Republic."}</p>
      {address && <p>{address}</p>}
      {registration && <p>{registration}</p>}
      {phone && <p>{phone}</p>}
      <p><a className="text-link" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
    </section>
  );
}
