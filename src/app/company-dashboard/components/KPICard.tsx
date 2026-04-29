interface KPICardProps {
  title: string;
  date: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'accent';
}

export default function KPICard({ title, date, icon, variant }: KPICardProps) {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-elevation-1 hover:shadow-elevation-2 transition-smooth">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground font-caption mb-2">
            {title}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {date}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${variantStyles[variant]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}