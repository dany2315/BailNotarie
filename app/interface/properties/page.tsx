import { redirect } from "next/navigation";

// La liste des biens n'est plus dans le menu : un bien se consulte depuis son dossier ou la fiche
// de son propriétaire. Les anciens liens mènent à la liste des clients.
export default function PropertiesPage() {
  redirect("/interface/clients");
}
