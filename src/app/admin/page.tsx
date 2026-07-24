import { redirect } from "next/navigation";
import AdminAfriConnectClient from "./AdminAfriConnectClient";
import { cookies } from "next/headers";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    redirect("/login");
  }
  const payloadBase64 = token.split(".")[1];
  const decodedPayload = JSON.parse(
    Buffer.from(payloadBase64, "base64").toString("utf-8"),
  );
  if(decodedPayload.role != "admin"){
    redirect("/dashboard");
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin`,{
    headers:{
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
  const data = await response.json()
  if(!response.ok){
    console.error(data.message, "TETS")
    return;
  }


  return (
    <AdminAfriConnectClient
      traiteurs={data.data.traiteurs ?? []}
      gpListings={data.data.gpListings ?? []}
      profiles={data.data.profiles ?? []}
    />
  );
}
