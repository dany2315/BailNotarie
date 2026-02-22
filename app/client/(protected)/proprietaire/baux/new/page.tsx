import { redirect } from "next/navigation";

export default function CreateBailPage() {
  redirect("/client/proprietaire/demandes?open=bail-new");
}
