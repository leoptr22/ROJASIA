declare global { namespace Express { interface Request { user?: { username: string; role: 'ADMINISTRADOR' } } } }
export {};
