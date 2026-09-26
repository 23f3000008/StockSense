export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="auth-brand">
          <div className="auth-brand-mark" />
          <span className="auth-brand-name">StockSense</span>
        </div>
        <h2>{title}</h2>
        {subtitle && <p className="auth-sub">{subtitle}</p>}
        {children}
        {footer && <div className="auth-foot">{footer}</div>}
      </div>
    </div>
  );
}
