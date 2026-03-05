import { redirect } from "next/navigation";

export default function CreatePropertyPage() {
  redirect("/client/proprietaire/demandes?open=bien-new");
}
