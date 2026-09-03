import bcrypt from 'bcrypt';
const password = process.argv[2];
if (!password) { console.error('Uso: npm run hash-password -- <contraseña>'); process.exit(1); }
console.log(await bcrypt.hash(password, 12));
