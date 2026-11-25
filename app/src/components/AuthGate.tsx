import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { errMsg } from "../lib/format";

const KEY = "srfin_session";
const AuthCtx = createContext<{ email: string; logout: () => void }>({ email: "", logout: () => {} });
export const useAuth = () => useContext(AuthCtx);

/** Shows the login page until someone is signed in. The session lives in the browser until Logout. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(KEY) ?? "");
  const me = useQuery(api.auth.me, token ? { token } : "skip");
  const doLogout = useMutation(api.auth.logout);

  const clear = () => { localStorage.removeItem(KEY); setToken(""); };

  if (token && me === undefined) return <div className="empty" style={{ marginTop: 80 }}>Loading…</div>;
  if (!token || !me) {
    return <Login onSignedIn={(t) => { localStorage.setItem(KEY, t); setToken(t); }} />;
  }
  return (
    <AuthCtx.Provider value={{ email: me.email, logout: () => { doLogout({ token }).catch(() => {}); clear(); } }}>
      {children}
    </AuthCtx.Provider>
  );
}

function Login({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const login = useMutation(api.auth.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSignedIn(await login({ email, password }));
    } catch (err) {
      setError(/wrong email/i.test(errMsg(err)) ? "Wrong email or password" : "Could not sign in. Is the database running?");
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.png" alt="SR Fin" className="login-logo" />
        <h1>Sign in</h1>
        <p className="hint">SUNDAR RAM FIN CONSULTANCY [P] LTD</p>
        <label className="f">
          <span className="lbl">Email</span>
          <input type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="f">
          <span className="lbl">Password</span>
          <div className="pw-wrap">
            <input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="pw-toggle" aria-label={show ? "Hide password" : "Show password"} title={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && <p className="warn" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy} style={{ justifyContent: "center", width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
