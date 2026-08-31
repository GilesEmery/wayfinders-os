import Link from "next/link";

export default function Page() {
  return <main className="admin-auth-page"><section className="admin-auth-panel"><p className="admin-kicker">Wayfinders OS</p><h1>Password recovery</h1><p className="admin-auth-intro">Password recovery will be available soon. Contact a Wayfinders administrator for help.</p><nav className="admin-auth-links"><Link href="/admin/login">Return to sign in</Link></nav></section></main>;
}
