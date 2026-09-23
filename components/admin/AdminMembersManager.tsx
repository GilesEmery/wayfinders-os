"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function AdminInviteForm() {
  const [message,setMessage]=useState(""); const [profileUrl,setProfileUrl]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");setProfileUrl("");const form=new FormData(event.currentTarget);const response=await fetch("/api/admin/admins",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.get("email")})});const data=await response.json();setBusy(false);setMessage(response.ok?"Secure administrator invitation sent by email.":data.error??"Unable to invite administrator.");setProfileUrl(typeof data.profileUrl==="string"?data.profileUrl:"");if(response.ok){event.currentTarget.reset();window.location.reload();}}
  return <form className="admin-inline-form" onSubmit={submit}><label>Email Address<input name="email" type="email" required /></label><button className="admin-primary" disabled={busy}>{busy?"SENDING…":"SEND INVITATION"}</button>{message&&<p role="status">{message}{profileUrl&&<> <Link href={profileUrl}>Open Wayfinder profile</Link></>}</p>}</form>;
}

export function AdminStatusButton({ memberId, status, isSelf }:{memberId:string;status:string;isSelf:boolean}){
  const [busy,setBusy]=useState(false);
  async function toggle(){if(isSelf||busy)return;if(!confirm(`${status==="disabled"?"Enable":"Disable"} this administrator?`))return;setBusy(true);const response=await fetch(`/api/admin/admins/${memberId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:status==="disabled"?"active":"disabled"})});setBusy(false);if(response.ok)window.location.reload();else alert("Unable to update administrator.");}
  return <button className="admin-text-button" onClick={toggle} disabled={busy||isSelf}>{isSelf?"CURRENT ACCOUNT":status==="disabled"?"ENABLE":"DISABLE"}</button>;
}
