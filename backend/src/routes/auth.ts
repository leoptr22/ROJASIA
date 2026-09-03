import { Router } from 'express'; import { z } from 'zod'; import { authService } from '../services/AuthService.js'; import { authMiddleware } from '../middleware/authMiddleware.js';
export const authRouter=Router(); const loginSchema=z.object({username:z.string().min(1),password:z.string().min(1)});
authRouter.post('/login',async(req,res)=>{const parsed=loginSchema.safeParse(req.body);if(!parsed.success){res.status(400).json({message:'Datos inválidos'});return;}const token=await authService.login(parsed.data.username,parsed.data.password);if(!token){res.status(401).json({message:'Usuario o contraseña incorrectos'});return;}res.cookie('access_token',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}).json({user:{username:parsed.data.username,role:'ADMINISTRADOR'}});});
authRouter.post('/logout',(_req,res)=>res.clearCookie('access_token').status(204).end());
authRouter.get('/me',authMiddleware,(req,res)=>res.json({user:req.user}));
