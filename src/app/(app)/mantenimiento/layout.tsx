type MantenimientoLayoutProps = {
  children: React.ReactNode;
};

export default function MantenimientoLayout({ children }: MantenimientoLayoutProps) {
  return <div className="bg-slate-50">{children}</div>;
}
