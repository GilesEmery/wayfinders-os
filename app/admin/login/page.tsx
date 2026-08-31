import { redirect } from "next/navigation";
import { AdminAuthForm } from "@/components/admin/AdminAuthForm";
import { getAdmin } from "@/lib/admin/auth";
export default async function Page(){if(await getAdmin())redirect("/admin");return <AdminAuthForm mode="login"/>;}
