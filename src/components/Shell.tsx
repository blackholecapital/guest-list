import type { ReactNode } from "react";

export default function Shell({children,compact=false}:{children:ReactNode;compact?:boolean}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/" className="brand">
          <img className="brand-logo" src="/assets/scores-logo.png" alt="Scores Tampa"/>
          <span className="brand-copy"><strong>Scores Tampa</strong><small>Guest List</small></span>
        </a>
        {!compact&&<nav><a href="/guest-list">Guest List</a><a href="/stats">Stats</a><a href="/promoters">Promoters</a><a href="/admin">Admin</a></nav>}
      </header>
      {children}
      <footer style={{marginTop:60,padding:"30px 20px",textAlign:"center",borderTop:"1px solid #333",color:"#999"}}>
        <img src="/assets/scores-logo.png" alt="Scores Tampa" style={{height:50,marginBottom:12}}/>
        <div style={{marginBottom:10}}>Scores Tampa<br/>2310 N Dale Mabry Highway<br/>Tampa, FL 33607<br/>(813) 875-7912</div>
        <div><a href="/privacy.html">Privacy Policy</a>{" | "}<a href="/terms.html">Terms & Conditions</a></div>
      </footer>
    </div>
  );
}
