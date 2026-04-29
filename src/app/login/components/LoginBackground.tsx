import React from 'react';

const LoginBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(27,94,32,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(46,125,50,0.06),transparent_50%)]" />
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default LoginBackground;