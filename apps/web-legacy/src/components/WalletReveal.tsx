import "./wallet.css";

type Props = {
  balance?: string;
  hint?: string;
};

export default function WalletReveal({ balance = "₺ 18.400,00", hint = "Cüzdana dokun, birikimini gör" }: Props) {
  return (
    <div className="wallet-stage">
      <div className="wallet" aria-label="Niyet cüzdanı önizlemesi">
        {/* Cards */}
        <div className="card stripe">
          <div className="card-inner">
            <div className="card-top">
              <span>Garanti</span>
              <div className="chip" />
            </div>
            <div className="card-bottom">
              <div>
                <span className="label">Hesap</span>
                <div className="value">DENİZ A.</div>
              </div>
              <div className="card-number-wrapper">
                <span className="label">Kart</span>
                <div className="hidden-stars">**** 4242</div>
                <div className="card-number">5524 9910 4242</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card wise">
          <div className="card-inner">
            <div className="card-top">
              <span>İş Bankası</span>
              <div className="chip" />
            </div>
            <div className="card-bottom">
              <div>
                <span className="label">Birikim</span>
                <div className="value">NİYET FONU</div>
              </div>
              <div className="card-number-wrapper">
                <span className="label">Kart</span>
                <div className="hidden-stars">**** 8810</div>
                <div className="card-number">9012 4432 8810</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card paypal">
          <div className="card-inner">
            <div className="card-top">
              <span>Akbank</span>
              <div className="chip" />
            </div>
            <div className="card-bottom">
              <div>
                <span className="label">Hesap</span>
                <div className="value">deniz@niyet.app</div>
              </div>
              <div className="card-number-wrapper">
                <span className="label">Kart</span>
                <div className="hidden-stars">**** 0094</div>
                <div className="card-number">3312 0045 0094</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pocket */}
        <div className="pocket">
          <svg viewBox="0 0 280 160" width="280" height="160" aria-hidden>
            <path
              d="M0,30 Q0,0 30,0 L250,0 Q280,0 280,30 L280,160 L0,160 Z"
              fill="#1e341e"
            />
            <path
              d="M0,30 Q0,0 30,0 L250,0 Q280,0 280,30"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          </svg>
          <div className="pocket-content">
            <div className="balance-stars">******</div>
            <div className="balance-real">{balance}</div>
            <div className="eye-icon-wrapper" aria-hidden>
              <svg className="eye-icon eye-slash" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-5.94" />
                <path d="M1 1l22 22" />
              </svg>
              <svg className="eye-icon eye-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0 }}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="wallet-hint">{hint}</div>
    </div>
  );
}
